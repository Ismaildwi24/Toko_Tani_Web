import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    // Verify signature key
    const payloadToHash = order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY;
    const computedSignature = crypto
      .createHash('sha512')
      .update(payloadToHash)
      .digest('hex');

    if (computedSignature !== signature_key) {
      console.warn('Invalid Midtrans Signature Key received in webhook!');
      return NextResponse.json({ error: 'Invalid signature key' }, { status: 403 });
    }

    // Determine new order status based on Midtrans transaction_status
    let newStatus = 'menunggu_pembayaran';

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        newStatus = 'diproses';
      }
    } else if (transaction_status === 'settlement') {
      newStatus = 'diproses';
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire'
    ) {
      newStatus = 'dibatalkan';
    } else if (transaction_status === 'pending') {
      newStatus = 'menunggu_pembayaran';
    }

    // Update order status in Supabase using Service Role client
    const supabase = createServiceClient();
    
    // First, find the order by id (uuid) or order_number
    let { data: order, error: findError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', order_id) // Assuming order_id sent to Midtrans is the DB order UUID
      .maybeSingle();

    if (!order) {
      // Try by order_number
      const { data: orderNumData } = await supabase
        .from('orders')
        .select('id, status')
        .eq('order_number', order_id)
        .maybeSingle();
      order = orderNumData;
    }

    if (!order) {
      console.error(`Order with ID ${order_id} not found in database`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const previousStatus = order.status;

    // Update status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Error updating order status in notification:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // If order goes from not-paid to paid ('diproses'), deduct stock and increase sold_count
    if (newStatus === 'diproses' && previousStatus !== 'diproses' && previousStatus !== 'dikirim' && previousStatus !== 'selesai') {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id);

      if (items) {
        for (const item of items) {
          if (item.product_id) {
            // Fetch current stock and sold_count
            const { data: prod } = await supabase
              .from('products')
              .select('stock, sold_count')
              .eq('id', item.product_id)
              .single();

            if (prod) {
              const updatedStock = Math.max(0, prod.stock - item.quantity);
              const updatedSoldCount = (prod.sold_count || 0) + item.quantity;
              
              await supabase
                .from('products')
                .update({
                  stock: updatedStock,
                  sold_count: updatedSoldCount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.product_id);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Error handling Midtrans notification webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
