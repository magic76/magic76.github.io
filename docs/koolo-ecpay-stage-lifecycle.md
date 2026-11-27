# Sandbox order lifecycle (NT$99)
Apply migration `0014_ecpay_stage_book_lifecycle.sql` to CREW_AUTH_DB after 0013 before deploying the updated test page. Existing 79/99 order records and callback routes remain intact.
- 30-minute local payment window; expiration/cancellation is UI metadata only, not ECPay cancellation.
- Same account + normalized chart facts: one unresolved 99 TWD attempt. Atomic INSERT guard prevents concurrent duplicate attempts. No identity or raw birth data is sent.
- QueryTradeInfo/V5 (stage only), manual check after 40 minutes; at most once per order every 10 minutes. Verify response MAC and merchant/transaction identity. 0 or ambiguous results do not unlock retry. Only verified 10200095 permits retry with a new trade number. Signed paid query can repair a missing callback; legitimate late notifications still settle the original order.
- Legacy NT$79 orders are read-only in lifecycle UI. Report state is separate from payment; the sandbox demo is generated synchronously (not a production AI queue).
- This is not a production payment state machine: production needs a logical order/attempt model, provider reconciliation jobs, duplicate-charge/refund handling, and end-to-end ECPay verification before enabling real payments.
Official query docs: https://developers.ecpay.com.tw/2890/
