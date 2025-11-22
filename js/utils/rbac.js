import { rolePermissions } from '../config.js';

export const RBAC = {
    /**
     * Check if a role has a specific permission
     * @param {string} role - The user's role
     * @param {string} permission - The permission key to check
     * @returns {boolean}
     */
    hasPermission: (role, permission) => {
        if (!role || !rolePermissions[role]) return false;
        return rolePermissions[role][permission] === true;
    },

    /**
     * Check if a user role meets the required role level
     * @param {string} userRole 
     * @param {string} requiredRole 
     * @returns {boolean}
     */
    checkAccess: (userRole, requiredRole) => {
        if (!userRole) return false;
        if (userRole === 'admin') return true; // Admin has access to everything usually
        if (userRole === requiredRole) return true;
        
        // Define hierarchy if needed
        const hierarchy = {
            'admin': 3,
            'employee': 2,
            'instructor': 2,
            'student': 1
        };

        return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
    }
};
