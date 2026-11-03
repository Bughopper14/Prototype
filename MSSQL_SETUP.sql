-- =========================================================================
-- LIUGONG APPS - MSSQL INITIALIZATION SCRIPT (CLEAN CORE INSTALL)
-- Database Target: LiugongApps_DB
-- Scope: Authentication, Portal Hub, and User Management
-- =========================================================================

-- 1. DATABASE CREATION
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'LiugongApps_DB')
BEGIN
    CREATE DATABASE LiugongApps_DB;
    PRINT '[+] Database LiugongApps_DB created.';
END
GO

USE LiugongApps_DB;
GO

-- 2. CLEAN UP EXISTING CORE TABLES (Reverse Order of Foreign Keys)
IF OBJECT_ID('web_push_subscriptions', 'U') IS NOT NULL DROP TABLE web_push_subscriptions;
IF OBJECT_ID('vapid_keys', 'U') IS NOT NULL DROP TABLE vapid_keys;
IF OBJECT_ID('audit_logs', 'U') IS NOT NULL DROP TABLE audit_logs;
IF OBJECT_ID('session_logs', 'U') IS NOT NULL DROP TABLE session_logs;
IF OBJECT_ID('user_app_roles', 'U') IS NOT NULL DROP TABLE user_app_roles;
IF OBJECT_ID('role_authorities', 'U') IS NOT NULL DROP TABLE role_authorities;
IF OBJECT_ID('authorities', 'U') IS NOT NULL DROP TABLE authorities;
IF OBJECT_ID('roles', 'U') IS NOT NULL DROP TABLE roles;
IF OBJECT_ID('applications', 'U') IS NOT NULL DROP TABLE applications;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
GO

-- 3. CORE SCHEMA DEFINITION

-- Applications Table
CREATE TABLE applications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    app_name NVARCHAR(100) NOT NULL UNIQUE,
    url_path NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    icon_class NVARCHAR(50) DEFAULT 'fas fa-layer-group'
);

-- Users Table
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100),
    position NVARCHAR(100) DEFAULT 'Staff',
    email NVARCHAR(255) NULL,
    is_active BIT DEFAULT 1,
    force_logout_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Roles Table
CREATE TABLE roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    app_id INT NOT NULL,
    role_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Authorities (Permissions) Table
CREATE TABLE authorities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    app_id INT NOT NULL,
    authority_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Role Authorities Mapping Table
CREATE TABLE role_authorities (
    role_id INT NOT NULL,
    authority_id INT NOT NULL,
    PRIMARY KEY (role_id, authority_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (authority_id) REFERENCES authorities(id) ON DELETE NO ACTION
);

-- User Application Roles Mapping Table
CREATE TABLE user_app_roles (
    user_id INT NOT NULL,
    app_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, app_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE NO ACTION,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    action NVARCHAR(MAX),
    app_name NVARCHAR(100),
    ip_address NVARCHAR(45),
    timestamp DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Session Tracking Table
CREATE TABLE session_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent VARCHAR(MAX),
    app_name VARCHAR(100) DEFAULT 'Portal Apps',
    login_time DATETIME DEFAULT GETDATE(),
    logout_time DATETIME NULL,
    is_invalidated BIT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- VAPID Keys Table for Push Notifications
CREATE TABLE vapid_keys (
    id INT IDENTITY(1,1) PRIMARY KEY,
    public_key NVARCHAR(MAX) NOT NULL,
    private_key NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Web Push Subscriptions Table
CREATE TABLE web_push_subscriptions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_json NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- 4. INITIAL SEED DATA

-- Base Applications
INSERT INTO applications (app_name, url_path, description, icon_class) 
VALUES ('User Management', '/user-management', 'Kelola semua user dan aplikasi', 'fas fa-users-cog');

-- Base Roles
INSERT INTO roles (app_id, role_name, description) 
VALUES (1, 'Super Admin', 'Full system management access');

-- Base Authorities
INSERT INTO authorities (app_id, authority_name, description) VALUES 
(1, 'manage_system', 'Akses Penuh Manajemen Sistem'),
(1, 'manage_users', 'Mengelola User, Role, dan Otoritas');

-- Role to Authorities Mapping
INSERT INTO role_authorities (role_id, authority_id) VALUES 
(1, 1),
(1, 2);

-- Initial Administrator Account (Username: admin / Password: admin123)
INSERT INTO users (username, password_hash, full_name, position, email, is_active)
VALUES (
    'admin',
    'scrypt:32768:8:1$s8L0Nb8D2bvFGBEX$438e915d1f3cc483ac9ba6f06b345cec5159c4105787f3f91155e6d4161caff83fc9277d5ed92462413a3691f1a17f6f87bec646615935d733dfcbb30d146d57',
    'System Admin',
    'Administrator',
    'admin@liugong.co.id',
    1
);

-- Assign Admin User to User Management application with Super Admin role
INSERT INTO user_app_roles (user_id, app_id, role_id)
VALUES (1, 1, 1);
GO

PRINT '=================================================================';
PRINT ' LIUGONG APPS CLEAN CORE DATABASE INITIALIZED SUCCESSFULLY!     ';
PRINT ' Default Admin: admin / admin123                                ';
PRINT '=================================================================';
