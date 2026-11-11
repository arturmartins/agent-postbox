## 01The challenge+

The Machine Payments Protocol (MPP) lets one program pay another over ordinary HTTP. You put a price on an endpoint. The caller pays. You send back what they bought. There's no checkout page, no billing account for the buyer, and no API key to hand out. MPP is an open standard, designed by Tempo and Stripe and proposed to the IETF.

Start on Tempo testnet, where the money isn't real. Once a test payment works, switch to one of the two preferred real payment methods: a Stripe card, using a Shared Payment Token, or Tempo mainnet. On mainnet, the money goes to your own Tempo wallet — log in and use that address. Don't reuse the testnet wallet.

- Must
    
    Your service must be reachable on the public internet, accept a payment, and return the result with a receipt. The receipt is your proof that the payment was accepted.
    
- Should
    
    Run npx mppx validate against your live endpoint. It checks that an agent can find the price, pay, and get a valid response.
    
- Could
    
    If you have time: charge for a longer session, bill while data is streaming, offer tools through MCP, publish a file that describes your price, or accept more than one way to pay.

## 02 What you’ll need+

1. 01
    
    ### A laptop
    
    You need a computer with a terminal and a code editor, because you will run a small server on it. A phone or a tablet will not work.
    
2. 02
    
    ### A coding agent
    
    A coding agent is a program that writes code with you, such as [Cursor](https://cursor.com/download), [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://developers.openai.com/codex/cli), [Amp](https://ampcode.com/install), or [Kiro](https://kiro.dev/downloads/). You paste a prompt, and it reads the MPP docs and writes the payment code.
    
3. 03
    
    ### A way to get paid
    
    Start on Tempo testnet. A testnet is a practice payment network: you create a wallet and fill it from a faucet, which hands out free test funds, so you can prove the payment works before any real money is involved. Once it works, switch that same route to a real payment. The two preferred ways are a Stripe card, using a Shared Payment Token, or Tempo mainnet, where the stablecoins are real. On mainnet, log in to your own Tempo wallet first. That address is where the money is sent. Do not reuse the practice wallet from testnet.


## 03 How MPP works+

The exchange is one request, a payment, and a retry. You do not send the buyer to a website to check out.

1. 01
    
    ### Request the resource
    
    Someone asks for the thing you are selling. That can be an agent, an app, or a person. They call your API, or any web address you choose. They do not create an account, and they do not need an API key.
    
2. 02
    
    ### Receive a 402 Challenge
    
    If they have not paid, your server answers with HTTP 402, which means Payment Required. The answer includes the price and the ways you accept payment. That answer is called a challenge.
    
3. 03
    
    ### Retry with a Credential
    
    The caller pays with the method you offered, then calls the same address again. This time the request includes proof that the payment happened. That proof is called a credential.
    
4. 04
    
    ### Return the resource and Receipt
    
    You check the credential. If it is valid, you send back the thing they bought, plus a receipt. The receipt is the record that you accepted the payment. That is the whole protocol.

## 04 Build an MPP integration+

Pick one of the three paths below. Whichever you choose, get a payment working on Tempo testnet first, using free practice funds. Once that works, switch the same route to a Stripe card or to Tempo mainnet. On mainnet, log in to your own Tempo wallet and use that address as the recipient — don't reuse the practice wallet from testnet.


### 01 Use a starter app

Start from a small API that already runs but doesn't charge yet. Clone it, try it, then paste a prompt that adds the payment.


These three APIs do things an agent might actually call for, and none of them charge yet. Clone one, run it, and confirm you get a normal success response. Then paste the prompt: the same request should now come back as HTTP 402 — payment required — until it's paid. Get that working on testnet first, then switch to a real payment as described above. Each folder's README walks through the same three checks: try it without payments, add MPP, then try a paid request. You need [Node 18 or newer](https://nodejs.org/en/download). The code is in [mpp-agent-service-examples](https://github.com/benjasl-stripe/mpp-agent-service-examples).



### 02 Add MPP to your existing service

You already have an API. Paste a prompt that puts a payment in front of one of its routes. If you can't change that server, put a small proxy in front of it instead.

Open the folder for the API you already run. Paste the route that should require payment, choose how the caller pays, then copy that prompt. The prompt sets up the payment method and makes that route answer with HTTP 402 until it is paid. If you would rather not change that service, you can [put a proxy in front of it](https://mpp.dev/guides/proxy-existing-service). A proxy is a small server that handles the payment, then forwards the request to the service you already have.



### 03 Start from scratch

You don't have a service yet. Pick an idea, or describe your own, and paste a prompt. The agent builds the API and the payment together.


You do not have an API yet. Pick an example an agent would pay for, or describe your own. The prompt tells your coding agent to build the service and charge for it on Tempo testnet first. Once that payment works, switch the same route to a Stripe card or to Tempo mainnet. On mainnet, log in to your own Tempo wallet and use that address as the recipient. Select an example to see the prompt.

Web search APIThe caller pays for each search and gets a list of results back. They do not sign up for an API key.Image generationThe caller sends a description and pays for one image. Your API returns a link to the file.Headless browserThe caller pays to open a browser, run one task, and close it. You can charge per run or per minute.Research briefThe caller pays once and gets a short brief on a topic, with the sources written out.MCP toolboxA coding agent pays each time it uses a tool, such as looking up docs or checking a repo.Physical-world actionThe caller pays first. Only then does the API do something in the real world, such as mailing a letter, ordering food, or triggering a device.


## 5 Deploy+

An agent on the internet cannot call a server that only runs on your laptop. You need a public web address. If you already have a host, use that. If you do not, [Stripe Projects](https://docs.stripe.com/projects) is one way to get one from the terminal. Your coding agent creates the hosting account, adds the service, and saves the credentials in the project. You still deploy the code onto that host, and you still set MPP_SECRET_KEY there. That key is a secret your server uses to sign receipts. `stripe projects env --pull` only writes those values into a file on your computer. It does not upload them to the host.

Prompt

Copy prompt

Use Stripe Projects to put this service on a public URL.

Install the Stripe CLI projects plugin if it is missing (`stripe plugin install projects`), then run `stripe projects init` in this directory.

Browse `stripe projects catalog` and add a hosting service that can run this Node server. Copy the exact provider/service slug from the catalog. Railway and Fly.io run a process. Vercel, Netlify, and Cloudflare Workers are in the catalog too. If the service has to stay alive, do not pick a static host.

Store MPP_SECRET_KEY with `stripe projects variables set` so it stays server-side. `stripe projects env --pull` only writes local files — also set that key on the host. Do not commit .env.

Deploy, then give me the public URL so I can run `npx mppx validate` against it.

- `stripe plugin install projects`
    
    Installs the Stripe Projects plugin, so the Stripe command-line tool can create hosts and save credentials for you.
    
    Copy
- `stripe projects init`
    
    Creates a Stripe project in this folder. Later commands use it to remember which app they belong to.
    
    Copy
- `stripe projects catalog`
    
    Lists the hosts you can add. Copy the provider and service names exactly as they are printed.
    
    Copy
- `stripe projects add <provider>/<service>`
    
    Creates the host. Replace the placeholder with the names you copied from the catalog. Do not guess them.
    
    Copy
- `stripe projects variables set mpp-secret --env-key MPP_SECRET_KEY`
    
    Saves the secret your server uses to sign receipts. Leave off --value and the command asks you to type it, so it does not sit in your shell history.


##  6 Submit+

When your API has a public endpoint, open [Submit](https://mpp-hackathon.vercel.app/submit) and paste that endpoint. The form reads the same files an agent would read to learn your price. The leaderboard records the day you submit.

1. 1. /openapi.json. This file describes your API. Each paid route should include x-payment-info, which is where the price is written.
2. 2. A 402 response. The scanner calls a paid route without paying. That call must come back as HTTP 402, with a header named WWW-Authenticate: Payment.
3. 3. /llms.txt. This is a short text file that tells an agent what you sell. It is optional. If you do not have one, the form asks you for the same facts.
4. 4. A short description. You enter the name of the service, who built it, and what the agent is buying. The form reads the payment methods from the OpenAPI file


## 07Resources+

- [What is MPP?Open](https://mpp.dev/overview)
- [Add payments to your APIOpen](https://mpp.dev/quickstart/server)
- [Use with agentsOpen](https://mpp.dev/quickstart/agent)
- [Starter appsOpen](https://github.com/benjasl-stripe/mpp-agent-service-examples)
- [Stripe ProjectsOpen](https://docs.stripe.com/projects)
- [Stripe MPPOpen](https://docs.stripe.com/payments/machine/mpp)
- [mppx TypeScript SDKOpen](https://mpp.dev/sdk/typescript)
- [Services directory](https://mpp.dev/services)
