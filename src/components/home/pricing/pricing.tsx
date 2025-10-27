import { Toggle } from '@/components/shared/toggle/toggle';
import { PriceCards } from '@/components/home/pricing/price-cards';
import { useEffect, useState } from 'react';
import { BillingFrequency, IBillingFrequency } from '@/constants/billing-frequency';
import { Environments, initializePaddle, Paddle } from '@paddle/paddle-js';
import { usePaddlePrices } from '@/hooks/usePaddlePrices';

interface Props {
  country: string;
}

export function Pricing({ country }: Props) {
  const [frequency, setFrequency] = useState<IBillingFrequency>(BillingFrequency[0]);
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);

  const { prices, loading } = usePaddlePrices(paddle, country);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN && process.env.NEXT_PUBLIC_PADDLE_ENV) {
      initializePaddle({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        environment: process.env.NEXT_PUBLIC_PADDLE_ENV as Environments,
      }).then((paddle) => {
        if (paddle) {
          setPaddle(paddle);
        }
      });
    }
  }, []);

  return (
    <section id="pricing" className="mx-auto max-w-7xl relative px-[32px] py-24">
      <div className="text-center mb-16">
        <h2 className="text-[40px] leading-[44px] md:text-[56px] md:leading-[60px] tracking-[-1.2px] font-medium mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-[18px] leading-[27px] text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your job search needs. All plans include a 14-day free trial.
        </p>
      </div>
      <div className="flex flex-col items-center justify-between">
        <Toggle frequency={frequency} setFrequency={setFrequency} />
        <PriceCards frequency={frequency} loading={loading} priceMap={prices} />
      </div>
    </section>
  );
}
