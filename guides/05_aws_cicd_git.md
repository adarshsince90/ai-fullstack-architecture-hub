# 05. AWS Cloud Infrastructure (CDK - Cloud Development Kit, S3 - Simple Storage Service, CloudFront), CircleCI & Git Workflows

## ☁️ AWS Static Site Architecture (S3 + CloudFront)

Deploying modern Single Page Applications (SPAs) like React to AWS requires low-latency global delivery, HTTPS termination, and proper routing.

```
                  ┌─────────────────┐
                  │   End User      │
                  └────────┬────────┘
                           │ HTTPS (SSL / Custom Domain)
                           ▼
                  ┌─────────────────┐
                  │ AWS CloudFront  │  <--- Global Edge Locations (Content Delivery Network - CDN Caching)
                  │ (Distribution)  │  <--- Custom 404 -> 200 /index.html Rule
                  └────────┬────────┘
                           │ Private OAC Access
                           ▼
                  ┌─────────────────┐
                  │ AWS S3 Bucket   │  <--- Static Assets (html, css, js bundles)
                  └─────────────────┘
```

### Key Components:
1. **AWS S3 (Simple Storage Service):** Object storage bucket containing compiled HTML/JS/CSS dist files.
2. **CloudFront CDN (Content Delivery Network):** Caches static assets globally at edge locations, reducing TTL for static assets and providing free SSL certificates via AWS Certificate Manager (ACM).
3. **Origin Access Control (OAC):** Secures S3 bucket so direct public access is blocked; only CloudFront can fetch objects.
4. **SPA 404 Fallback Rule:** Because client-side routers (React Router) handle routes like `/dashboard`, CloudFront custom error responses map `404 Not Found` to `/index.html` with status `200 OK`.

---

## 🏗️ AWS CDK v2 Infrastructure Code Snippet

Defining S3 + CloudFront infrastructure in TypeScript via AWS CDK v2:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class ReactAppDeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Private S3 Bucket for App Assets
    const websiteBucket = new s3.Bucket(this, 'ReactAppBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. CloudFront Distribution with OAC & SPA Fallback
    const distribution = new cloudfront.Distribution(this, 'ReactAppCDN', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: distribution.distributionDomainName,
    });
  }
}
```

---

## 🔄 CI/CD Pipeline Automation: CircleCI

CircleCI pipeline workflow automating yarn dependency caching, unit testing, building dist bundle, uploading to S3, and invalidating CloudFront CDN cache.

```yaml
version: 2.1

executors:
  node-executor:
    docker:
      - image: cimg/node:20.10.0
    working_directory: ~/repo

jobs:
  build-and-test:
    executor: node-executor
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-deps-{{ checksum "yarn.lock" }}
      - run:
          name: Install Dependencies
          command: yarn install --frozen-lockfile
      - save_cache:
          paths:
            - node_modules
          key: v1-deps-{{ checksum "yarn.lock" }}
      - run:
          name: Run Linter & Tests
          command: |
            yarn lint
            yarn test --watchAll=false
      - run:
          name: Build Production Bundle
          command: yarn build
      - persist_to_workspace:
          root: .
          paths:
            - dist

  deploy-to-aws:
    executor: node-executor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install AWS CLI
          command: |
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
      - run:
          name: Sync Assets to S3 & Invalidate CloudFront
          command: |
            aws s3 sync dist/ s3://$AWS_S3_BUCKET_NAME --delete
            aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*"

workflows:
  build-test-deploy:
    jobs:
      - build-and-test
      - deploy-to-aws:
          requires:
            - build-and-test
          filters:
            branches:
              only: main
```

---

## 🐙 Git Master Workflows & Security Maintenance

### Rebase vs Merge in Senior FE Workflows
- **`git merge feature`:** Preserves complete historical context, creating a non-linear merge commit.
- **`git rebase main`:** Re-applies feature commits cleanly on top of latest `main`, creating a linear commit history.

```bash
# Clean Rebase Workflow
git checkout feature/react-dashboard
git fetch origin
git rebase origin/main
# Resolve any conflicts...
git push origin feature/react-dashboard --force-with-lease
```

### Triaging Dependabot Security Alerts
When Dependabot flags vulnerable packages in yarn dependencies:
1. Run `yarn audit` to identify the severity path.
2. Check if it affects direct dependencies or transitive sub-dependencies.
3. Use `resolutions` in `package.json` to force sub-dependency patch versions:
   ```json
   "resolutions": {
     "semver": "^7.5.4"
   }
   ```
4. Run `yarn install` and verify build integrity via test suite.
