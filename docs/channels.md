# Channel adapters

WhatsApp and Messenger both call the same desk as the website. Neither route sends a message to Meta unless the send token is set. The demo still stores the conversation and returns the reply in the JSON body so you can test without a business account.

Verify token, when the env var is empty: `northwind-demo`.

## WhatsApp Cloud API

Webhook URL: `https://hvac-chat.quvantic.com/api/webhooks/whatsapp`

Subscribe to `messages`. The verify handshake is `GET` with `hub.mode`, `hub.verify_token`, and `hub.challenge`.

A text message is read from `entry[].changes[].value.messages[].text.body`. The sender id is `from`. The reply is produced by the core agent. If `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set, the route also posts to `graph.facebook.com`.

## Facebook Messenger

Webhook URL: `https://hvac-chat.quvantic.com/api/webhooks/messenger`

A text message is read from `entry[].messaging[].message.text`. The sender is `sender.id`. If `MESSENGER_PAGE_TOKEN` is set, the route posts to the Send API.

## Sample payloads

WhatsApp:

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              { "from": "15555550100", "id": "wamid.1", "type": "text", "text": { "body": "My AC is not cooling" } }
            ]
          }
        }
      ]
    }
  ]
}
```

Messenger:

```json
{
  "entry": [
    {
      "messaging": [
        { "sender": { "id": "user-9" }, "message": { "text": "What does the Comfort Club include?" } }
      ]
    }
  ]
}
```
