/**
 * Admin utilities for payment orders
 * Validates admin access based on environment variables
 */

/**
 * Check if a user is an admin
 * Reads ADMIN_USER_IDS from environment variable (comma-separated UUIDs)
 * 
 * @param userId - The user ID to check
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(userId: string): boolean {
  const adminUserIds = process.env.ADMIN_USER_IDS;
  
  if (!adminUserIds) {
    return false;
  }

  // Split by comma and trim whitespace
  const adminIds = adminUserIds
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  return adminIds.includes(userId);
}

/**
 * Get list of admin user IDs from environment
 * @returns Array of admin user IDs
 */
export function getAdminUserIds(): string[] {
  const adminUserIds = process.env.ADMIN_USER_IDS;
  
  if (!adminUserIds) {
    return [];
  }

  return adminUserIds
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}


