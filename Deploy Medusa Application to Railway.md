# Deploy Medusa Application to Railway

In this document, youâll learn how to deploy your Medusa application to [Railway](https://railway.app/).

## What Youâll Deploy

1. PostgreSQL database.
2. Redis database.
3. Medusa application in server mode, with the Medusa Admin.
4. Medusa application in worker mode.

The same Medusa project is used to deploy the server and worker modes. Learn more about the `workerMode` configuration in [this document](https://docs.medusajs.com/learn/configurations/medusa-config#workermode).

***

### Prerequisites

- [Medusa applicationâs codebase hosted on GitHub repository.](https://docs.medusajs.com/learn/installation)

## 1. Configure Medusa Application

### Worker Mode

The `workerMode` configuration determines which mode the Medusa application runs in. As mentioned at the beginning of this guide, youâll deploy two Medusa applications: one in server mode, and one in worker mode.

So, add the following configuration in `medusa-config.ts`:

```ts title="medusa-config.ts"
module.exports = defineConfig({
  projectConfig: {
    // ...
    workerMode: process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server",
  },
})
```

Later, youâll set different values of the `MEDUSA_WORKER_MODE` environment variable for each Medusa application deployment.

### Configure Medusa Admin

You need to disable the Medusa Admin in the worker Medusa application, while keeping it enabled in the server Medusa application. So, add the following configuration in `medusa-config.ts`:

```ts title="medusa-config.ts"
module.exports = defineConfig({
  // ...
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
})
```

Later, youâll set different values of the `DISABLE_MEDUSA_ADMIN` environment variable.

### Configure Redis URL

The `redisUrl` configuration specifies the connection URL to Redis to store the Medusa server's session.

Learn more in the [Medusa Configuration documentation](https://docs.medusajs.com/learn/configurations/medusa-config#redisurl).

Add the following configuration in `medusa-config.ts` :

```ts title="medusa-config.ts"
module.exports = defineConfig({
  projectConfig: {
    // ...
    redisUrl: process.env.REDIS_URL,
  },
})
```

***

## 2. Add predeploy Script

Before you start the Medusa application in production, you should always run migrations and sync links.

So, add the following script in `package.json`:

```json
"scripts": {
  // ...
  "predeploy": "medusa db:migrate"
},
```

***

## 3. Install Production Modules and Providers

By default, your Medusa application uses modules and providers useful for development, such as the In-Memory Cache Module or the Local File Module Provider. Itâs highly recommended to instead use modules and providers suitable for production, including:

- [Redis Cache Module](https://docs.medusajs.com/infrastructure-modules/cache/redis)
- [Redis Event Bus Module](https://docs.medusajs.com/infrastructure-modules/event/redis)
- [Workflow Engine Redis Module](https://docs.medusajs.com/infrastructure-modules/workflow-engine/redis)
- [S3 File Module Provider](https://docs.medusajs.com/infrastructure-modules/file/s3) (or other file module providers production-ready).
- [SendGrid Notification Module Provider](https://docs.medusajs.com/infrastructure-modules/notification/sendgrid) (or other notification module providers production-ready).

For example, add the following modules to `medusa-config.ts`:

```ts title="medusa-config.ts"
import { Modules } from "@medusajs/framework/utils"

module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: {
        redis: {
          url: process.env.REDIS_URL,
        },
      },
    },
  ],
})
```

Check out the [Integrations](https://docs.medusajs.com/integrations) and [Infrastructure Modules](https://docs.medusajs.com/infrastructure-modules) documentation for other modules and providers to use.

***

## 4. Create Railway Project and Host PostgreSQL Database

Push all changes youâve made in the previous step to the GitHub repository before proceeding.

To create a Railway project:

1. Go to [Railway](https://railway.app/), and log in or create an account.
2. In your account dashboard, click the New Project button.
3. Choose Deploy PostgreSQL

This creates a new project with just a PostgreSQL database. Youâll add more services in the next steps.

***

## 5. Add Redis Database to Project

To add a Redis database service to your project:

1. Click on the Create button at the top right.
2. Choose Database â Add Redis

***

## 6. Deploy the Medusa Application in Server Mode

In this section, youâll add a Medusa application service in server mode to the Railway project, configure, and deploy it.

### Create Service

To create the service for the Medusa application in server mode:

1. Click on the Create button.
2. Choose GitHub Repo.
3. Choose the repository of your Medusa application.

This adds a new service to your project.

### Add Environment Variables

To add environment variables to the Medusa application in server mode:

1. Click on its card in the project dashboard.
2. Choose the Variables tab.
3. Click on RAW Editor, and paste the following in the editor:

```bash
COOKIE_SECRET=supersecret # TODO GENERATE SECURE SECRET
JWT_SECRET=supersecret  # TODO GENERATE SECURE SECRET
STORE_CORS= # STOREFRONT URL
ADMIN_CORS= # ADMIN URL
AUTH_CORS= # STOREFRONT AND ADMIN URLS, SEPARATED BY COMMAS
DISABLE_MEDUSA_ADMIN=false
MEDUSA_WORKER_MODE=server
PORT=9000
DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}
REDIS_URL=${{Redis.REDIS_PUBLIC_URL}}
```

Where:

- The value of `COOKIE_SECRET` and `JWT_SECRET` must be a randomly generated secret.
- `STORE_CORS`'s value is the URL of your storefront. If you donât have it yet, you can skip adding it for now.
- `ADMIN_CORS`'s value is the URL of the admin dashboard, which is the same as the server Medusa application. You can add it later if you don't currently have it.
- `AUTH_CORS`'s value is the URLs of any application authenticating users, customers, or other actor types, such as the storefront and admin URLs. The URLs are separated by commas. If you donât have the URLs yet, you can set its value later.
- Set `DISABLE_MEDUSA_ADMIN`'s value to `false` so that the admin is built with the server application.
- `REDIS_URL`'s value is automatically generated using Railwayâs template syntax. You add the `?family=0` to the connection string to support both IPv6 and IPv4 connections.

Feel free to add any other relevant environment variables. Once youâre done, click the Update Variables button.

### Set Start Command

To set the `start` command of your Medusa application in server mode:

1. Click on its card in the project dashboard.
2. Choose the Settings tab.
3. Scroll down to the Deploy section.
4. Under the âCustom Start Commandâ field, click the "+ Start Command" button.
5. Enter the following in the input and click the check mark button:

```bash npm2yarn
cd .medusa/server && npm install && npm run predeploy && npm run start
```

### Deploy Changes

To deploy the changes of the Medusa application in server mode, click on the Deploy button at the top center of the project. This takes a couple of minutes.

Make sure to wait until the PostgreSQL and Redis services are fully deployed before deploying the Medusa application.

### Set Domain Name

You can either generate a random domain name or set a custom one. To do that:

1. Click on the Medusa application running in server mode.
2. Choose the Settings tab.
3. Scroll down to the Networking section.
4. Under Public Networking, click on Generate domain to generate a domain name or Custom domain to add your custom domain.
   1. If the domain doesn't point to the `9000` port, make sure to edit it and set the port to `9000`.

### Set Backend URL in Admin Configuration

After youâve obtained the Medusa applicationâs URL, add the following configuration to `medusa-config.ts`:

```ts title="medusa-config.ts"
module.exports = defineConfig({
  // ...
  admin: {
    // ...
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
})
```

Then, push the changes to the GitHub repository.

In Railway, add / modify the following environment variables for the Medusa application in server mode to use the server Medusa applicationâs URL:

```bash
ADMIN_CORS=https://railway... # MEDUSA APPLICATION URL
AUTH_CORS=https://railway... # ADD MEDUSA APPLICATION URL
MEDUSA_BACKEND_URL=https://railway... # MEDUSA APPLICATION URL
```

Where you set the value of `ADMIN_CORS` and `MEDUSA_BACKEND_URL` to the Medusa applicationâs URL you got from the previous step. As for `AUTH_CORS`, if you have another URL set, you add a comma `,` followed by the Medusa applicationâs URL. Otherwise, you set it to the Medusa applicationâs URL.

Once you're done, click on the Deploy button at the top center of the dashboard to deploy the changes.

***

## 7. Deploy the Medusa Application in Worker Mode

In this section, youâll add the Medusa application in worker mode to the Railway project, configure, and deploy it.

The process is similar to deploying the application in server mode, with slight changes in the configuration.

### Create Service

To create the service for the Medusa application in worker mode:

1. Click on the Create button.
2. Choose GitHub Repo.
3. Choose the same repository of your Medusa application.

This adds a new service to your project.

### Add Environment Variables

To add environment variables to the Medusa application in worker mode:

1. Click on its card in the project dashboard.
2. Choose the Variables tab.
3. Click on RAW Editor, and paste the following in the editor:

```bash
COOKIE_SECRET=supersecret # TODO GENERATE SECURE SECRET
JWT_SECRET=supersecret  # TODO GENERATE SECURE SECRET
DISABLE_MEDUSA_ADMIN=true
MEDUSA_WORKER_MODE=worker
PORT=9000
DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}
REDIS_URL=${{Redis.REDIS_PUBLIC_URL}}
```

Where:

- The value of `COOKIE_SECRET` and `JWT_SECRET` must be a randomly generated secret.
- Set `DISABLE_MEDUSA_ADMIN`'s value to `true` so that the admin isn't built with the worker application.
- `REDIS_URL`'s value is automatically generated using Railwayâs template syntax. You add the `?family=0` to the connection string to support both IPv6 and IPv4 connections.

Feel free to add any other relevant environment variables. Once youâre done, click the Update Variables button.

### Set Start Command

To set the `start` command of your Medusa application in worker mode:

1. Click on its card in the project dashboard.
2. Choose the Settings tab.
3. Scroll down to the Deploy section.
4. Under the âCustom Start Commandâ field, click the "+ Start Command" button.
5. Enter the following in the input and click the check mark button:

```bash npm2yarn
cd .medusa/server && npm install && npm run start
```

### Deploy Changes

To deploy the changes of the Medusa application in working mode, click on the Deploy button at the top center of the project. This takes a couple of minutes.

***

## 8. Test Deployed Application

To test out the deployed application, go to `<APP_URL>/health`, where `<APP_URL>` is the URL of the Medusa application in server mode. If the deployment was successful, youâll see the `OK` response.

The Medusa Admin is also available at `<APP_URL>/app`.

***

## Create Admin User

To create an admin user, install the [Railway CLI tool](https://docs.railway.app/guides/cli). Then, log in:

```bash
railway login
```

After that, run the following command in the local Medusa project's directory to link it to the Railway project:

```bash
railway link
```

When asked to select a service, choose the service for the Medusa application in server mode.

Then, in your local directory of the Medusa project, run the following command:

```bash
railway run npx medusa user -e admin-medusa@test.com -p supersecret
```

Replace the email `admin-medusa@test.com` and password `supersecret` with the credentials you want.

You can use these credentials to log into the Medusa Admin dashboard.

***

## Troubleshooting

To check issues or errors in your deployed Medusa application:

1. Click on the card of the Medusa application in server mode.
2. Click on the Deployments tab.
3. Click on the View Logs button.

### Set Host

If you encounter issues with the Medusa application, try setting a `HOST` environment variable to `0.0.0.0`:

```bash
HOST=0.0.0.0
```

Learn more in the [Railway Documentation](https://docs.railway.com/guides/public-networking).

***

## Update Deployed Application

To update the deployed Medusa application, update the dependencies in the `package.json` file for `@medusajs/*` and re-install dependencies:

```bash npm2yarn
npm install
```

Then, push the changes to the GitHub repository. In your application, the new dependency versions will be installed and migrations will run, updating your database.

Learn more about updating Medusa in [this documentation](https://docs.medusajs.com/learn/update).