const { z } = require('zod');

const signupSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email().max(150),
  password: z.string().min(8).max(200),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable()
});

const loginSchema = z.object({
  email: z.string().email().max(150),
  password: z.string().min(1).max(200)
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(150)
});

const resetPasswordSchema = z.object({
  token: z.string().min(20).max(500),
  new_password: z.string().min(8).max(200).optional(),
  password: z.string().min(8).max(200).optional()
}).refine(
  (data) => !!(data.new_password || data.password),
  { message: 'new_password is required.' }
);

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email().max(150),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(1000).optional().nullable()
});

const bookingSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email().max(150),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  serviceType: z.string().min(2).max(50),
  cleaningLevel: z.string().optional().nullable(),
  serviceSize: z.string().optional().nullable(),
  productSelection: z.array(z.string()).optional(),
  propertyType: z.string().optional().nullable(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  sizeSqft: z.number().nonnegative().optional().nullable(),
  date: z.string().min(4).max(20),
  time: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  addOns: z.array(z.string()).optional(),
  health_acknowledged: z.boolean().refine(val => val === true, {
    message: "You must acknowledge the health and safety disclosure."
  }),
  health_notes: z.string().optional().nullable(),
  total: z.number().nonnegative(),
  deposit: z.number().nonnegative(),
  balance: z.number().nonnegative(),
  status: z.string().optional().nullable()
});

const orderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      price: z.number().nonnegative(),
      quantity: z.number().int().positive().max(100)
    })
  ).min(1),
  totals: z.object({
    total: z.number().nonnegative(),
    deposit: z.number().nonnegative().optional(),
    balance: z.number().nonnegative().optional()
  }),
  payment: z.object({
    accountType: z
      .string()
      .transform((v) => String(v || '').trim())
      .refine(
        (v) => ['checking', 'savings', 'credit', 'debit', 'paypal'].includes(v.toLowerCase()),
        { message: 'Invalid account type.' }
      ),
    accountLast4: z
      .string()
      .transform((v) => String(v || '').replace(/\D/g, ''))
      .refine((v) => /^\d{4}$/.test(v), { message: 'Account number must be exactly 4 digits.' })
  }),
  customer: z.object({
    fullName: z.string().min(2).max(150),
    email: z.string().email().max(150),
    phone: z.string().min(3).max(50),
    address: z.string().min(3).max(255)
  })
});

const productUpsertSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().min(1).max(5000),
  price_cents: z.number().int().positive(),
  category: z
    .string()
    .transform((v) => String(v).trim())
    .refine(
      (v) =>
        [
          'Soap',
          'Bleach',
          'Bundle',
          'Spray',
          'Cloth',
          'Disinfectant',
          'Glass Cleaner',
          'Uncategorized'
        ].includes(v),
      { message: 'Invalid category' }
    ),
  stock_quantity: z.number().int().nonnegative(),
  status: z.enum(['in_stock', 'out_of_stock']),
  sku: z.string().max(80).optional().nullable(),
  image_url: z.string().max(5000).optional().nullable(),
  additional_images: z.array(z.string().max(5000)).optional().default([]),
  badge: z.string().max(50).optional().nullable(),
  features: z.array(z.string().min(1).max(200)).optional().default([])
});

function validate(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  const message = result.error.errors.map(e => e.message).join('; ');
  return { ok: false, error: message || 'Invalid input.' };
}

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
  bookingSchema,
  orderSchema,
  productUpsertSchema,
  validate
};
