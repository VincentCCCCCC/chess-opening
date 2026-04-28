class StorageError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details || null;
  }
}

function corruptedData(message, details) {
  return new StorageError('corrupted_data', message, details);
}

function unsupportedSchema(schemaVersion) {
  return new StorageError('unsupported_schema', `Unsupported schema version: ${schemaVersion}`, { schemaVersion });
}

module.exports = {
  StorageError,
  corruptedData,
  unsupportedSchema,
};
