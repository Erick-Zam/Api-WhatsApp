import { query } from '../db.js';

const ROLE_CACHE_TTL_MS = 60 * 1000;
const rolePermissionCache = new Map();

const ADMIN_ROLES = new Set([
    'admin',
    'super_admin',
    'audit_admin',
    'user_admin',
    'ops_admin',
]);

const isSchemaMissing = (error) => error?.code === '42P01' || error?.code === '42703';

const getCachedPermissions = (role) => {
    const cached = rolePermissionCache.get(role);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
        rolePermissionCache.delete(role);
        return null;
    }
    return cached.permissions;
};

const setCachedPermissions = (role, permissions) => {
    rolePermissionCache.set(role, {
        permissions,
        expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
    });
};

const loadPermissionsForRole = async (role) => {
    const cached = getCachedPermissions(role);
    if (cached) return cached;

    const result = await query(
        `SELECT p.name
         FROM permissions p
         INNER JOIN role_permissions rp ON rp.permission_id = p.id
         INNER JOIN roles r ON r.id = rp.role_id
         WHERE r.name = $1`,
        [role]
    );

    const permissions = new Set(result.rows.map((row) => row.name));
    setCachedPermissions(role, permissions);
    return permissions;
};

export const authorizeAdminAccess = () => (req, res, next) => {
    if (!req.user?.role) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!ADMIN_ROLES.has(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    return next();
};

export const authorizePermission = (permissionName) => async (req, res, next) => {
    if (!req.user?.role) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
    }

    try {
        const permissions = await loadPermissionsForRole(req.user.role);
        if (!permissions.has(permissionName)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        return next();
    } catch (error) {
        if (isSchemaMissing(error)) {
            return res.status(403).json({
                error: 'Forbidden: permission schema is not available for this role',
            });
        }
        return res.status(500).json({ error: 'Permission check failed' });
    }
};

export const authorizeAnyPermission = (permissionNames) => async (req, res, next) => {
    if (!req.user?.role) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
    }

    try {
        const permissions = await loadPermissionsForRole(req.user.role);
        const canAccess = permissionNames.some((name) => permissions.has(name));
        if (!canAccess) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        return next();
    } catch (error) {
        if (isSchemaMissing(error)) {
            return res.status(403).json({
                error: 'Forbidden: permission schema is not available for this role',
            });
        }
        return res.status(500).json({ error: 'Permission check failed' });
    }
};
