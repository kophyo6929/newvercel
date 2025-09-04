import express from 'express';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import { fallbackUsers, fallbackOrders } from '../controllers/fallbackData';

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    let users;
    
    if (req.dbConnected && req.prisma) {
      users = await req.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          isAdmin: true,
          credits: true,
          banned: true,
          createdAt: true,
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Fallback approach
      users = fallbackUsers.map(user => ({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        credits: user.credits,
        banned: user.banned,
        createdAt: user.createdAt,
        _count: { orders: 0 } // Simplified for fallback
      })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all orders (admin only)
router.get('/orders', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const orders = await req.prisma.order.findMany({
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin only)
router.put('/orders/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const orderId = parseInt(req.params.id);

    const order = await req.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status
    const updatedOrder = await req.prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    // If approving credit order, add credits to user
    if (status === 'APPROVED' && order.type === 'CREDIT') {
      const creditAmount = Math.floor(order.amount / 10); // 1 credit per 10 MMK
      
      await req.prisma.user.update({
        where: { id: order.userId },
        data: { 
          credits: { increment: creditAmount },
          notifications: {
            push: `Credit purchase approved! ${creditAmount} credits added to your account.`
          }
        }
      });
    }

    // Add notification to user
    const notificationMessage = status === 'APPROVED' 
      ? `Your ${order.type.toLowerCase()} order has been approved!`
      : `Your ${order.type.toLowerCase()} order has been ${status.toLowerCase()}.`;

    await req.prisma.user.update({
      where: { id: order.userId },
      data: {
        notifications: { push: notificationMessage }
      }
    });

    res.json({ order: updatedOrder, message: `Order ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Ban/unban user (admin only)
router.put('/users/:id/ban', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { banned } = req.body;
    const userId = parseInt(req.params.id);

    const user = await req.prisma.user.update({
      where: { id: userId },
      data: { banned }
    });

    res.json({ 
      user, 
      message: banned ? 'User banned successfully' : 'User unbanned successfully' 
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to update user ban status' });
  }
});

// Broadcast message to users (admin only)
router.post('/broadcast', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { message, targetIds } = req.body;

    if (targetIds && Array.isArray(targetIds)) {
      // Send to specific users
      await req.prisma.user.updateMany({
        where: { id: { in: targetIds } },
        data: {
          notifications: { push: message }
        }
      });
    } else {
      // Send to all users
      await req.prisma.user.updateMany({
        data: {
          notifications: { push: message }
        }
      });
    }

    const targetCount = targetIds ? targetIds.length : await req.prisma.user.count();
    res.json({ message: `Broadcast sent to ${targetCount} users` });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Update payment details (admin only)
router.put('/payment-accounts/:provider', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { provider } = req.params;
    const { name, number, active } = req.body;

    const paymentAccount = await req.prisma.paymentAccount.upsert({
      where: { provider },
      update: { name, number, active },
      create: { provider, name, number, active }
    });

    res.json({ paymentAccount, message: 'Payment account updated successfully' });
  } catch (error) {
    console.error('Update payment account error:', error);
    res.status(500).json({ error: 'Failed to update payment account' });
  }
});

// Update settings (admin only)
router.put('/settings/:key', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await req.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    res.json({ setting, message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;