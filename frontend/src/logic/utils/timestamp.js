/**
 * Get the current timestamp in the format "YYYY-MM-DD_HH-MM-SS".
 * 
 * @returns {string} The current timestamp.
 */
export function getCurrentTimestamp() {
    const datePadding = 2; // Pad month, day, hours, minutes, seconds to 2 digits

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(datePadding, '0');
    const day = String(now.getDate()).padStart(datePadding, '0');
    const hours = String(now.getHours()).padStart(datePadding, '0');
    const minutes = String(now.getMinutes()).padStart(datePadding, '0');
    const seconds = String(now.getSeconds()).padStart(datePadding, '0');

    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    return timestamp;
}