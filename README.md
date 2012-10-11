Ruhroh is a node.js helper lib to create the Error classes for restify-based
API services.

This depends on the [restify v2.0
branch](https://github.com/mcavage/node-restify/tree/v2.0)
which, at the time of this writing, is not yet the main release version of
restify.


# Usage

This could be "lib/errors.js" in your app:

    var ruhroh = require("ruhroh");

    var ERRORS = [
        ['ValidationFailed', 422, 'Validation of input parameters failed. See "errors" array for specific failures.'],
    ];

    module.exports = ruhroh.createErrorClasses(ERRORS);

The built error heirarchy will include error classes for the given `ERRORS`
specific to your API, plus the stock [restify v2.0 errors](XXX link). Those
marked with a `*` are the ones actually exported.

    Error
        verror.WError
            restify.HttpError
                // An error class for each HTTP status code.
                ResourceNotFoundError   404         *
                ServiceUnavailableError 5??         *
                InternalServerError     500         *
                ...

                restify.RestError
                    // Core restify error classes.
                    InvalidArgumentError    409     *
                    ...

                // Custom error classes.
                ValidationFailedError   422         *


# Motivation

1.  Make it easy to have a clean "lib/errors.js" module for a restify-based
    API which includes all errors that API can respond with.

2.  Add support for an optional 'errors' array in standard error responses,
    as is part of the (currently still internal) Joyent Engineering Guidelines
    (JEG).

    A typical plain restify error response looks like this:

        HTTP/1.1 409 Conflict
        ...

        {
          "code": "InvalidArgument",
          "message": "I just don't like you"
        }

    That's with handler code like this:

        throw new restify.InvalidArgumentError("I just don't like you");

    The goal here is to allow error responses like this:

        HTTP/1.1 409 Conflict
        ...

        {
          "code": "InvalidArgument",
          "message": "I just don't like you"
          "errors": [...]
        }

    with code like this:

        throw new restify.InvalidArgumentError({
            message: "I just don't like you",
            errors: [...]
        });



# Error class call signatures

All the error classes returned here will have the following call signatures
and result in API error responses as shown in the examples.

1.  No arguments -> no error message. This shouldn't really be used.

        throw new ValidationFailedError();

    Example response:

        HTTP/1.1 422 Unprocessable Entity
        ...
        {
          "code": "ValidationFailed",
          "message": ""
        }

2.  Just a message:

        throw new ValidationFailedError("my message");

    Example response:

        HTTP/1.1 422 Unprocessable Entity
        ...
        {
          "code": "ValidationFailed",
          "message": "my message"
        }

3.  An internal cause exception. This doesn't impact the response output
    (intentionally), but the cause is show in a restify audit log.

        throw new ValidationFailedError(causeErr, "my message");

    Example response:

        HTTP/1.1 422 Unprocessable Entity
        ...
        {
          "code": "ValidationFailed",
          "message": "my message"
        }

4. Specifying a list of errors:

        throw new MyError({cause: causeErr, message: "my message",
            errors: [...]});

    Example response:

        HTTP/1.1 422 Unprocessable Entity
        ...
        {
          "code": "ValidationFailed",
          "message": "my message",
          "errors": [...]
        }

5. Explicitly setting the error response body.

        throw new MyError({body: {foo: "bar"}});

    Example response:

        HTTP/1.1 422 Unprocessable Entity
        ...
        {
          "foo": "bar"
        }


# Error causes

While not a part of ruhroh, it is worth pointing out that errors in restify v2.0
are all based on
[`verror.WError`](https://github.com/davepacheco/node-verror#werror-for-wrapped-errors)
which support a `cause` exception to indicate an underlying cause for an API
endpoint error response. A contrived example:

        var fs = require('fs');
        var errors = require('./errors');

        //...

        server.on('after', restify.auditLogger({log: this.log, body: true}));
        server.get('/stat/:path', function (req, res, next) {
            fs.stat(req.params.path, function (err, stats) {
                if (err) {
                    // Here the fs.stat `err` is the "cause".
                    return next(new errors.InternalError(err, "could not stat"));
                }
                res.send(stats)
                next();
            });
        });

These cause details are typically *internal*, so don't show up in the API
response, but are useful in logs. With the restify audit log as above, the
log will look like this:

    [2012-10-11T22:56:54.734Z]  INFO: my/44739 on 0525989e-2086-4270-b960-41dd661ebd7d handled: 500 (3ms, audit=true, remoteAddress=10.2.207.2, remotePort=49091, _audit=true)
        GET /stat/foo HTTP/1.1
        user-agent: curl/7.27.0
        host: 10.2.207.13
        accept: application/json
        content-type: application/json
        --
        HTTP/1.1 500 Internal Server Error
        content-type: application/json
        content-length: 51

        {
          "code": "InternalError",
          "message": "could not stat"
        }
        --
        InternalError: could not stat; caused by Error: ENOENT, stat 'foo'
            at new Object.keys.forEach.module.exports.(anonymous function) (.../lib/errors.js:147:33)
            at .../lib/app.js:215:25
            at Object.oncomplete (fs.js:297:15)
        Caused by: Error: ENOENT, stat 'foo'

I.e. awesome detail there.


# Features

(all TODO)

- easily build a data-driven error heirarchy
- support for 'errors' array in error response body
- general restdown/markdown doc table of errors (for API docs)
