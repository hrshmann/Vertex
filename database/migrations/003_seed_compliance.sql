-- Placeholder compliance copy. The operator MUST replace every one of these with text that
-- matches the actual licensed entity, jurisdiction and regulatory permissions before the site
-- goes live — see spec section 30. Shipping these placeholders in production, unedited, would
-- misrepresent the business.

INSERT INTO system_settings (`key`, value) VALUES
  ('compliance.risk_disclosure', '"Trading leveraged financial products and cryptocurrencies involves significant risk and may not be suitable for all investors. You may lose some or all of your invested capital. Please consider your financial circumstances and risk tolerance before trading."'),
  ('compliance.terms_and_conditions', '"PLACEHOLDER — replace with your Terms & Conditions, drafted for your licensed entity and jurisdiction."'),
  ('compliance.privacy_policy', '"PLACEHOLDER — replace with your Privacy Policy."'),
  ('compliance.cookie_policy', '"PLACEHOLDER — replace with your Cookie Policy."'),
  ('compliance.aml_policy', '"PLACEHOLDER — replace with your AML Policy."'),
  ('compliance.kyc_policy', '"PLACEHOLDER — replace with your KYC Policy."'),
  ('compliance.execution_policy', '"PLACEHOLDER — replace with your Order Execution Policy."'),
  ('compliance.client_agreement', '"PLACEHOLDER — replace with your Client Agreement."'),
  ('compliance.fees_and_charges', '"PLACEHOLDER — replace with your Fees & Charges schedule."'),
  ('compliance.complaints_procedure', '"PLACEHOLDER — replace with your Complaints Procedure."'),
  ('platform.is_licensed_broker', 'false'),
  ('platform.operating_entity_name', '""')
ON DUPLICATE KEY UPDATE `key` = `key`;
