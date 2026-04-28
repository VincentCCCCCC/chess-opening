class ChessError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ChessError';
    this.code = code;
    this.details = details || null;
  }
}

module.exports = {
  ChessError,
};
