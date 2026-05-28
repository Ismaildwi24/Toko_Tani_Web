const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';

const API_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

export interface CreateTransactionParams {
  order_id: string;
  gross_amount: number;
  customer_details: {
    first_name: string;
    email: string;
    phone?: string;
  };
  item_details?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export async function createMidtransTransaction(params: CreateTransactionParams) {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error('MIDTRANS_SERVER_KEY is not defined in environment variables');
  }

  // Encode Server Key using Base64 for Basic Auth (Note: Server Key must end with a colon)
  const authString = `${MIDTRANS_SERVER_KEY}:`;
  const base64Auth = Buffer.from(authString).toString('base64');

  const payload = {
    transaction_details: {
      order_id: params.order_id,
      gross_amount: params.gross_amount,
    },
    customer_details: params.customer_details,
    item_details: params.item_details,
  };

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${base64Auth}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Midtrans response error text:', errorText);
    throw new Error(`Midtrans API error: ${errorText}`);
  }

  // Returns: { token: string, redirect_url: string }
  return response.json();
}
