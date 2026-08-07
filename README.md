# n8n-nodes-direct7

This is an n8n node for sending and managing WhatsApp, SMS, and Number Lookup (HLR) messaging through [Direct7 Networks (D7)](https://d7networks.com).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### WhatsApp

| Operation | Description |
|-----------|-------------|
| **Send Message** | Send a WhatsApp message (text, attachment, location, contacts, interactive, or template) |
| **Get Status Report** | Retrieve delivery status report by request ID |
| **Read Receipts** | Mark incoming WhatsApp messages as read |
| **Download Media** | Download media content from WhatsApp by media ID |

**Message types supported by Send Message:**
- **Text** – Plain text with optional URL preview
- **Attachment** – Image, video, audio, document, or sticker with optional caption
- **Location** – Longitude/latitude with optional name and address
- **Contacts** – Up to 10 vCard contacts
- **Interactive** – CTA URL button, reply buttons, list picker, or location request
- **Template** – Approved WhatsApp Business template with body parameters, media header, buttons (quick replies, dynamic URL, coupon code, flow), and carousel support

### SMS

| Operation | Description |
|-----------|-------------|
| **Send Message** | Send an SMS to one or more recipients, either the same content to multiple recipients or different content per destination group |
| **Get Status Report** | Retrieve SMS message log and delivery status by request ID |
| **Get Pricing** | Retrieve SMS pricing for all countries or a specific country (ISO code) |

**Send Message options:**
- **Send Mode** – Same content to multiple recipients, or different content per destination
- **Message Type** – Text, Audio SMS, Multimedia, or Image
- **Data Coding** – Text, Unicode, or Auto character encoding
- **Report URL** – Optional webhook to receive delivery reports (DLR)
- **Schedule Time** – Optionally schedule the message for future delivery
- **Number Lookup** – Optionally verify the recipient number is active (via HLR) before sending
- **Tag / Global Tag** – Optional reference strings attached to messages

### HLR (Number Lookup)

| Operation | Description |
|-----------|-------------|
| **Number Lookup** | Submit an HLR (Home Location Register) lookup request for a recipient number |
| **Get Lookup Report** | Retrieve the number lookup status and result by request ID |

## Credentials

You need a **Direct7 API** credential:

1. Log in to your [D7 Networks account](https://app.d7networks.com).
2. Navigate to **API Tokens** and generate a new bearer token.
3. In n8n, create a new credential of type **Direct7 API**.
4. Paste the token into the **Access Token** field and save.

The credential is verified automatically against the D7 API token-verification endpoint.

Full credential documentation: see the [Credentials](#credentials) section above.

## Compatibility

- Minimum n8n version: **24.0.0**
- Tested against **n8n 24.0.0**
- Uses `n8nNodesApiVersion: 1`

## Usage

### Send a text message

1. Add the **Direct7** node to your workflow.
2. Select **Resource → WhatsApp** and **Operation → Send Message**.
3. Set **Originator** to your registered WhatsApp sender number.
4. Set **Recipient** to the destination number in international format (e.g. `+971500000000`).
5. Choose **Message Type → Text** and fill in **Message Body**.
6. Execute the node. The response includes a `request_id` that can be used with **Get Status Report**.

### Send a template message

1. Choose **Message Type → Template**.
2. Enter the **Template ID** and **Template Language** (e.g. `en`).
3. Optionally add **Body Parameters**, a **Media Type**, **Buttons**, or enable **Use Carousel**.

### Check delivery status

1. Add a second **Direct7** node.
2. Select **Operation → Get Status Report**.
3. Set **Request ID** to the value returned by the send operation.

### Send an SMS

1. Add the **Direct7** node to your workflow.
2. Select **Resource → SMS** and **Operation → Send Message**.
3. Choose a **Send Mode**: same content to multiple recipients, or different content per destination.
4. Set **Originator**, **Recipients**, and **Content**.
5. Execute the node. The response includes a `request_id` that can be used with **Get Status Report**.

### Look up a number (HLR)

1. Add the **Direct7** node to your workflow.
2. Select **Resource → HLR (Number Lookup)** and **Operation → Number Lookup**.
3. Set **Recipient** to the number to look up (e.g. `+971500000000`).
4. Execute the node, then use **Operation → Get Lookup Report** with the returned **Request ID** to retrieve the result.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Direct7 WhatsApp API reference](https://d7networks.com/docs/whatsapp/overview/)
- [Direct7 SMS API reference](https://d7networks.com/docs/sms/overview/)
- [Direct7 Number Lookup (HLR) API reference](https://d7networks.com/docs/number-lookup/overview/)
- [D7 API authentication](https://d7networks.com/docs/Authentication/Overview/)

## Version history

| Version | Changes |
|---------|---------|
| 1.0.5 | Current release: WhatsApp (Send, Get Status Report, Read Receipts, Download Media), SMS (Send, Get Status Report, Get Pricing), and Number Lookup / HLR (Lookup, Get Lookup Report) |
| 1.0.3 | Version bump and packaging fixes |
| 1.0.0 | Initial release: WhatsApp messaging, SMS messaging, and Number Lookup (HLR) service |
