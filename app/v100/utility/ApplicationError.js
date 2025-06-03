/* eslint-disable max-classes-per-file */
class DomainError extends Error {
    constructor(message, status) {
        super(message);
        this.Name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.Status = status || 500;
    }
    }
    
class ValidationError extends DomainError {
    constructor(items) {
        super(items.statusText);
        this.Name = "ValidationError";
        this.Status = items.status;
        this.Items = items.errors;
            // this.message = 'validat';
    }
    }
    
class InternalError extends DomainError {
    constructor(message) {
        super('InternalError');
        this.Name = "InternalError";
        this.Status = 500;
        this.Items = message.stack;
    }
    }
    
class AuthorizeError extends DomainError {
    constructor(message) {
        super(message);
        this.Name = "AuthorizeError";
        this.Status = 403;
        this.Items = message;
    }
    }
    
class LoginError extends DomainError {
    constructor(message) {
        super(message);
        this.Name = "LoginError";
        this.Status = 403;
        this.Items = message;
    }
    }
    
class RequestError extends DomainError {
    constructor(message) {
        super(message);
        this.Name = "RequestError";
        this.Status = 400;
        this.Items = message;
    }
    }
class MysqlError extends DomainError {
    constructor(message) {
        super(message);
        this.Name = "MysqlError";
        this.Status = 500;
        this.Items = message;
    }
    }
class RedisError extends DomainError {
    constructor(message) {
        super(message);
        this.Name = "MysqlError";
        this.Status = 500;
        this.Items = message;
    }
    }
    
    
module.exports = {
    InternalError,
    ValidationError,
    AuthorizeError,
    LoginError,
    RequestError,
    MysqlError,
    RedisError
};