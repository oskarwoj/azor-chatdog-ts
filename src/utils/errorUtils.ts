/**
 * Error handling utilities
 */

/**
 * Extracts a string message from an unknown error value.
 * @param error - Unknown error value (Error instance, string, or other)
 * @returns String representation of the error
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
