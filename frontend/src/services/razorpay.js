const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const SUPPORTED_RAZORPAY_METHODS = new Set(['upi', 'card', 'netbanking', 'wallet']);

let razorpayLoadPromise = null;

export const loadRazorpay = () => {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true);
  }
  if (razorpayLoadPromise) {
    return razorpayLoadPromise;
  }

  razorpayLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          razorpayLoadPromise = null;
          existingScript.remove();
          reject(new Error('Razorpay Checkout could not be loaded. Check your network connection.'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayLoadPromise = null;
      script.remove();
      reject(new Error('Razorpay Checkout could not be loaded. Check your network connection.'));
    };
    document.body.appendChild(script);
  });

  return razorpayLoadPromise;
};

export const normalizeRazorpayMethod = (paymentMethod) => {
  if (!paymentMethod || typeof paymentMethod !== 'string') return null;
  const normalized = paymentMethod.trim().toLowerCase();
  return SUPPORTED_RAZORPAY_METHODS.has(normalized) ? normalized : null;
};

const sanitizeContact = (phone) => {
  if (!phone) return undefined;
  const cleaned = String(phone).replace(/[\s()-]/g, '');
  return cleaned || undefined;
};

export const openRazorpayCheckout = async ({
  payment,
  selectedMethod,
  prefill = {},
  onSuccess,
  onFailure,
  onDismiss,
}) => {
  await loadRazorpay();
  if (!window.Razorpay) {
    throw new Error('Razorpay Checkout SDK is unavailable.');
  }

  const rawMethod = selectedMethod || payment?.paymentMethod;
  const methodKey = normalizeRazorpayMethod(rawMethod);
  let outcome = null;

  const options = {
    key: payment.keyId,
    amount: Math.round(Number(payment.amount) * 100),
    currency: payment.currency || 'INR',
    name: 'VOGNIX',
    description: `Order ${payment.orderNumber}`,
    order_id: payment.razorpayOrderId,
    prefill: {
      name: prefill.name || undefined,
      email: prefill.email || undefined,
      contact: sanitizeContact(prefill.contact),
      ...(methodKey ? { method: methodKey } : {}),
    },
    notes: {
      selectedPaymentMethod: rawMethod || 'ONLINE',
      vognixOrderNumber: payment.orderNumber,
    },
    ...(methodKey
      ? {
          config: {
            display: {
              blocks: {
                preferred: {
                  name: `Selected: ${String(rawMethod).toUpperCase()}`,
                  instruments: [{ method: methodKey }],
                },
              },
              sequence: ['block.preferred'],
              preferences: { show_default_blocks: true },
            },
          },
        }
      : {}),
    theme: { color: '#e11d48' },
    handler: async (result) => {
      outcome = 'success';
      await onSuccess?.(result);
    },
    modal: {
      ondismiss: () => {
        if (!outcome) {
          onDismiss?.();
        }
      },
    },
  };

  const checkout = new window.Razorpay(options);
  checkout.on('payment.failed', async (event) => {
    outcome = 'failed';
    await onFailure?.(event);
  });
  checkout.open();
  return checkout;
};
