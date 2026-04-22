const FREE_DELIVERY_THRESHOLD = 50;
const DELIVERY_FEE = 5;

function computeDeliveryFee(subtotal) {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

function toMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

module.exports = {
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  computeDeliveryFee,
  toMoney,
};
