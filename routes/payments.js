==> Docs on specifying a Node.js version: https://render.com/docs/node-version
==> Installing Node.js version 26.5.1...
==> Running build command 'npm install'...
up to date, audited 15 packages in 533ms
found 0 vulnerabilities
==> Uploading build...
==> Uploaded in 1.6s. Compression took 0.9s
==> Build successful 🎉
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
==> Running 'node server.js'
/opt/render/project/src/routes/payments.js:2
<<<<<<< HEAD
^^
SyntaxError: Unexpected token '<<'
    at wrapSafe (node:internal/modules/cjs/loader:1866:18)
    at Module._compile (node:internal/modules/cjs/loader:1908:20)
    at Object..js (node:internal/modules/cjs/loader:2074:10)
    at Module.load (node:internal/modules/cjs/loader:1656:32)
    at Module._load (node:internal/modules/cjs/loader:1448:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.require (node:internal/modules/cjs/loader:1679:12)
    at require (node:internal/modules/helpers:196:16)
    at Object.<anonymous> (/opt/render/project/src/server.js:25:1)
    at Module._compile (node:internal/modules/cjs/loader:1934:14)
Node.js v26.5.1
==> Exited with status 1
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
==> Running 'node server.js'
/opt/render/project/src/routes/payments.js:2
<<<<<<< HEAD
^^
SyntaxError: Unexpected token '<<'
    at wrapSafe (node:internal/modules/cjs/loader:1866:18)
    at Module._compile (node:internal/modules/cjs/loader:1908:20)
    at Object..js (node:internal/modules/cjs/loader:2074:10)
    at Module.load (node:internal/modules/cjs/loader:1656:32)
    at Module._load (node:internal/modules/cjs/loader:1448:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.require (node:internal/modules/cjs/loader:1679:12)
    at require (node:internal/modules/helpers:196:16)
    at Object.<anonymous> (/opt/render/project/src/server.js:25:1)
    at Module._compile (node:internal/modules/cjs/loader:1934:14)
Node.js v26.5.1
