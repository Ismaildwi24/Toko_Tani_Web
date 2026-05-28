import { NextResponse } from 'next/server';
import { createMidtransTransaction } from '@/lib/midtrans';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, amount, customer_name, customer_email, phone, items } = body;

    if (!order_id || !amount || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: 'Parameter order_id, amount, customer_name, dan customer_email wajib diisi' },
        { status: 400 }
      );
    }

    // Call Midtrans API
    const responseMidtrans = await createMidtransTransaction({
      order_id,
      gross_amount: amount,
      customer_details: {
        first_name: customer_name,
        email: customer_email,
        phone: phone || '',
      },
      item_details: items?.map((item: any) => ({
        id: item.product_id,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
    });

    const snapToken = responseMidtrans.token;
    const redirectUrl = responseMidtrans.redirect_url;

    // Update order with midtrans_token in database using service role client
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('orders')
      .update({ midtrans_token: snapToken })
      .eq('id', order_id); // Wait, are we using uuid or order_id?
      // Wait, in schema, orders table id is uuid. The order_number is "TK-XXXX".
      // We should check if order_id is the uuid (id) or order_number.
      // Usually it's the uuid. Let's make sure it updates based on uuid first, if error, fallback to order_number.
    
    let updateError = error;
    if (updateError) {
      // Try by order_number instead
      const { error: error2 } = await supabase
        .from('orders')
        .update({ midtrans_token: snapToken })
        .eq('order_number', order_id);
      updateError = error2;
    }

    if (updateError) {
      console.error('Error updating order with snap token:', updateError);
      return NextResponse.json(
        { error: 'Gagal memperbarui transaksi dengan token pembayaran' },
        { status: 500 }
      );
    }

    return NextResponse.json({ snap_token: snapToken, redirect_url: redirectUrl });
  } catch (error: any) {
    console.error('Error in create-token route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
