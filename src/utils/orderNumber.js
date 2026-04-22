function generateOrderNumber() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `DC${random}`;
}

module.exports = { generateOrderNumber };
