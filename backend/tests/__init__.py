"""Backend tests.

Safety (IN-007): a developer's backend/.env can point at the PRODUCTION database. Importing this
package runs before any test module and before the app is imported, so the app's own database
setting is replaced with an address that cannot connect. A test that forgets to override `get_db`
then fails loudly instead of writing to a real database. Tests that need real MongoDB use
TEST_MONGODB_URL and a local address only (see conftest.py).
"""

import os

os.environ["MONGODB_URL"] = "mongodb://127.0.0.1:1/ghartak_pytest_never_connects"
