/*
 * Copyright 2012 Trent Mick.  All rights reserved.
 * Copyright 2012 Joyent, Inc.  All rights reserved.
 *
 * A helper lib to build an error hierarchy for your restify-based REST API.
 */

//TODO: a helper that emits restdown doc table for errors

var util = require('util');
var RestError = require('restify').RestError;
var HttpError = require('restify').HttpError;
var restifyErrors = require('restify/lib/errors');


//---- globals




//---- exported stuff

/**
 * Build a set of error classes for a restify-based REST API.
 * TODO: more details.
 *
 * @param customErrorData {Array} An array of 3-tuples `[REST-CODE,
 *      HTTP-STATUS-CODE, DESCRIPTION]`. E.g.,
 *          [
 *              ['ValidationFailed', 422, 'Validation of input ...'],
 *              ...
 *          ];
 * @returns {Object} A mapping of error class name to error class. This is
 *      suitable for `module.exports`.
 */
function createErrorClasses(customErrorData) {
    var errorClasses = {};

    for (var i = 0; i < customErrorData.length; i++) {
        var restCode = customErrorData[i][0];
        var statusCode = customErrorData[i][1];
        var name = restCode;
        if (!/\w+Error$/.test(name)) {
            name += 'Error';
        }

        var ErrorClass = errorClasses[name] = function (cause, message) {
            var index = 1;
            var opts = {
                restCode: restCode,
                statusCode: statusCode
            };
            if (cause && cause instanceof Error) {
                opts.cause = cause;
                opts.constructorOpt = arguments.callee;
            } else if (typeof (cause) === 'object') {
                opts.body = cause.body;
                opts.cause = cause.cause;
                opts.constructorOpt = cause.constructorOpt;
                opts.message = cause.message;
                opts.errors = cause.errors;
                if (opts.errors && !opts.body) {
                    opts.body = {
                        code: opts.restCode,
                        message: opts.message,
                        errors: opts.errors
                    };
                }
                opts.statusCode = cause.statusCode || statusCode;
            } else {
                opts.constructorOpt = arguments.callee;
                index = 0;
            }
            var args = Array.prototype.slice.call(arguments, index);
            args.unshift(opts);
            RestError.apply(this, args);
        };

        util.inherits(ErrorClass, HttpError);
        ErrorClass.displayName = ErrorClass.prototype.name = name;
    }

    Object.keys(restifyErrors).forEach(function (name) {
        // Filter out exports that are not WError subclasses.
        if (restifyErrors[name].prototype.cause) {
            var WrappedError = errorClasses[name] = function (cause, message) {
                restifyErrors[name].apply(this, arguments);
                if (typeof (cause) === 'object' &&
                    cause.errors && !cause.body) {
                    this.body.errors = cause.errors;
                }
            };
            util.inherits(WrappedError, restifyErrors[name]);
            WrappedError.displayName = WrappedError.prototype.name = name;
        }
    });

    return errorClasses;
}



// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects
var coreErrors = {
    Error: Error,
    EvalError: EvalError,
    RangeError: RangeError,
    ReferenceError: ReferenceError,
    SyntaxError: SyntaxError,
    TypeError: TypeError,
    URIError: URIError
};

/**
 * Return an IMGAPI error class from the given string. The string `s` can
 * elide the 'Error' suffix for convenience.
 *
 * @param errorClasses {Object} The mapping of error classes, e.g. from
 *      `createErrorClasses`.
 * @param s {String} The error name.
 * @param allowCoreErrors {Boolean} Allow core JS errors, e.g. TypeError, to
 *      be returned. Default false.
 * @returns {Error} An app error class (or one of the core JS error classes).
 *      Default 'InternalError' if no match is found.
 */
function errorClassFromString(errorClasses, s, allowCoreErrors) {
    var name = s || 'InternalError';
    if (name.slice(-5) !== 'Error') {
        name += 'Error';
    }
    var errorClass = errorClasses[name];
    if (!errorClass && allowCoreErrors && coreErrors[name])
        errorClass = coreErrors[name];
    if (!errorClass)
        errorClass = errorClasses['InternalError'];
    return errorClass;
}



//---- exports

module.exports = {
    createErrorClasses: createErrorClasses,
    errorClassFromString: errorClassFromString
}
