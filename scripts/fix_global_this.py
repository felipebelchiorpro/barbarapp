file_path = "pocketbase/pb_hooks/naville_hooks.pb.js"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    "function registerStripePaymentInCloudState(session) {",
    "globalThis.registerStripePaymentInCloudState = function(session) {"
)
text = text.replace(
    "registerStripePaymentInCloudState(sess);",
    "(globalThis.registerStripePaymentInCloudState || registerStripePaymentInCloudState)(sess);"
)
text = text.replace(
    "const inv = registerStripePaymentInCloudState(sess);",
    "const inv = (globalThis.registerStripePaymentInCloudState || registerStripePaymentInCloudState)(sess);"
)
text = text.replace(
    "registerStripePaymentInCloudState(sessionObj);",
    "(globalThis.registerStripePaymentInCloudState || registerStripePaymentInCloudState)(sessionObj);"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated globalThis for registerStripePaymentInCloudState")
