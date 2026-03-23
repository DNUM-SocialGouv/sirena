export const logMessage = (message: string, ...args: unknown[]) => {
  console.log(message, ...args);
};

export const logError = (message: string, ...args: unknown[]) => {
  console.error(message, ...args);
};
