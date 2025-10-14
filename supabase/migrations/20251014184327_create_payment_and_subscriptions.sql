/*
  # Payment and Subscription Schema

  ## Overview
  This migration creates tables for managing payments, subscriptions, and billing
  for the therapy platform.

  ## New Tables
  
  ### `subscription_plans`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Plan name (e.g., "Basic", "Premium")
  - `description` (text) - Plan description
  - `price_monthly` (decimal) - Monthly price
  - `price_yearly` (decimal) - Yearly price
  - `sessions_per_month` (integer) - Number of sessions included
  - `messaging_enabled` (boolean) - Unlimited messaging access
  - `video_enabled` (boolean) - Video session access
  - `is_active` (boolean) - Whether plan is currently offered
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `subscriptions`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - References profiles.id
  - `plan_id` (uuid) - References subscription_plans.id
  - `status` (text) - active, cancelled, expired, past_due
  - `current_period_start` (timestamptz) - Current billing period start
  - `current_period_end` (timestamptz) - Current billing period end
  - `cancel_at_period_end` (boolean) - Whether to cancel at end of period
  - `cancelled_at` (timestamptz) - Cancellation timestamp
  - `stripe_subscription_id` (text) - Stripe subscription ID
  - `stripe_customer_id` (text) - Stripe customer ID
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `payments`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - References profiles.id
  - `subscription_id` (uuid) - References subscriptions.id (nullable for one-time)
  - `appointment_id` (uuid) - References appointments.id (nullable)
  - `amount` (decimal) - Payment amount
  - `currency` (text) - Currency code (USD, EUR, etc.)
  - `status` (text) - pending, succeeded, failed, refunded
  - `payment_method` (text) - card, bank_transfer, etc.
  - `stripe_payment_intent_id` (text) - Stripe payment intent ID
  - `failure_reason` (text) - Reason if failed
  - `refunded_at` (timestamptz) - Refund timestamp
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `therapist_payouts`
  - `id` (uuid, primary key) - Unique identifier
  - `therapist_id` (uuid) - References therapist_profiles.id
  - `amount` (decimal) - Payout amount
  - `currency` (text) - Currency code
  - `status` (text) - pending, processing, completed, failed
  - `period_start` (date) - Payout period start
  - `period_end` (date) - Payout period end
  - `stripe_payout_id` (text) - Stripe payout ID
  - `processed_at` (timestamptz) - Processing timestamp
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can view their own subscriptions and payments
  - Therapists can view their own payouts
  - Only admins can manage subscription plans

  ## Indexes
  - Index on subscriptions by user_id and status
  - Index on payments by user_id and status
  - Index on therapist_payouts by therapist_id and status
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  price_monthly decimal(10,2) NOT NULL DEFAULT 0.00,
  price_yearly decimal(10,2) NOT NULL DEFAULT 0.00,
  sessions_per_month integer NOT NULL DEFAULT 0,
  messaging_enabled boolean DEFAULT false,
  video_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method text DEFAULT 'card',
  stripe_payment_intent_id text UNIQUE,
  failure_reason text DEFAULT '',
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create therapist_payouts table
CREATE TABLE IF NOT EXISTS therapist_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  stripe_payout_id text UNIQUE,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_therapist_payouts_therapist ON therapist_payouts(therapist_id, status);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, sessions_per_month, messaging_enabled, video_enabled) VALUES
  ('Basic', 'Essential therapy sessions', 99.00, 990.00, 2, true, true),
  ('Standard', 'Regular therapy support', 179.00, 1790.00, 4, true, true),
  ('Premium', 'Comprehensive care', 299.00, 2990.00, 8, true, true),
  ('Unlimited', 'Unlimited therapy access', 499.00, 4990.00, 999, true, true)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_payouts ENABLE ROW LEVEL SECURITY;

-- Subscription plans policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Therapist payouts policies
CREATE POLICY "Therapists can view own payouts"
  ON therapist_payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = therapist_id);

-- Triggers
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();