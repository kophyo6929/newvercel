import express from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user's orders
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const orders = await req.prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create credit purchase order
router.post('/credit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { amount, proofImage } = req.body;

    if (!amount || amount < 1000) {
      return res.status(400).json({ error: 'Minimum credit amount is 1000 MMK' });
    }

    const order = await req.prisma.order.create({
      data: {
        userId: req.user!.id,
        type: 'CREDIT',
        amount: parseInt(amount),
        proofImage,
        status: 'PENDING'
      }
    });

    // Send notification to admin
    await req.prisma.user.updateMany({
      where: { isAdmin: true },
      data: {
        notifications: {
          push: `New credit purchase request: ${amount} MMK from ${req.user!.username}`
        }
      }
    });

    res.status(201).json({ 
      order,
      message: 'Credit purchase request submitted successfully' 
    });
  } catch (error) {
    console.error('Create credit order error:', error);
    res.status(500).json({ error: 'Failed to create credit order' });
  }
});

// Create product purchase order
router.post('/product', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.body;

    // Get product details
    const product = await req.prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check user credits
    const user = await req.prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (user!.credits < product.priceCr) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    // Deduct credits and create order
    await req.prisma.$transaction(async (prisma) => {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { credits: { decrement: product.priceCr } }
      });

      await prisma.order.create({
        data: {
          userId: req.user!.id,
          type: 'PRODUCT',
          amount: product.priceCr,
          productId: productId,
          status: 'PENDING'
        }
      });
    });

    // Send notification to admin
    await req.prisma.user.updateMany({
      where: { isAdmin: true },
      data: {
        notifications: {
          push: `New product order: ${product.name} from ${req.user!.username}`
        }
      }
    });

    res.status(201).json({ 
      message: `Product order placed successfully. ${product.priceCr} credits deducted.` 
    });
  } catch (error) {
    console.error('Create product order error:', error);
    res.status(500).json({ error: 'Failed to create product order' });
  }
});

export default router;