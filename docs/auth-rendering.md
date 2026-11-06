# Session rendering

Pages that use `AppLayout` render per request. Do not export `getStaticProps`
from these pages: explicit static generation bypasses the request-time
`_app.getInitialProps` lookup and serves anonymous navigation even when the
browser has a valid session. Hydration then replaces Login with the user's
avatar and name.

Keep the shared `_app.getInitialProps` lookup and pass its user directly through
`GeneralProvider` on the server and first browser render. Its HTTP client already
restores expired access tokens using the request's refresh cookie. Do not move
this initial session lookup into an effect or use a globally shared server store.

Pages without the authenticated navigation, such as standalone product/privacy
pages and the login form, may remain static.

Regression checks must inspect the initial document and the full hydration
sequence, including browser refresh, both locales, a session with a photo, expired
access tokens, and delayed browser auth requests. Checking only the eventual
logged-in UI will miss this failure.
