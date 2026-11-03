import { Vehicle } from '../types';

export interface RentalPrice {
  amount: number;
  discountAmount: number;
  appliedDailyRate: number;
  rateType: 'JOURNALIER' | 'HEBDOMADAIRE' | 'MENSUEL';
  monthlyPeriods: number;
  remainingDays: number;
}

export const calculateRentalPrice = (vehicle: Vehicle, days: number): RentalPrice => {
  const duration = Math.max(1, Math.floor(days));
  const dailyDiscount = Math.min(5000, vehicle.dailyRate);
  const discountedDailyRate = vehicle.dailyRate - dailyDiscount;

  if (duration >= 30 && vehicle.monthlyRate > 0) {
    const monthlyPeriods = Math.floor(duration / 30);
    const remainingDays = duration % 30;
    const discountAmount = dailyDiscount * remainingDays;
    const amount = monthlyPeriods * vehicle.monthlyRate + remainingDays * discountedDailyRate;
    return {
      amount,
      discountAmount,
      appliedDailyRate: amount / duration,
      rateType: 'MENSUEL',
      monthlyPeriods,
      remainingDays,
    };
  }

  const appliedDailyDiscount = duration >= 7 ? dailyDiscount : 0;
  const appliedDailyRate = vehicle.dailyRate - appliedDailyDiscount;

  return {
    amount: appliedDailyRate * duration,
    discountAmount: appliedDailyDiscount * duration,
    appliedDailyRate,
    rateType: duration >= 7 ? 'HEBDOMADAIRE' : 'JOURNALIER',
    monthlyPeriods: 0,
    remainingDays: duration,
  };
};
