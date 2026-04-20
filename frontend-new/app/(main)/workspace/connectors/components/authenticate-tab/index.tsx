'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Flex, Text, Select } from '@radix-ui/themes';
import { MaterialIcon } from '@/app/components/ui/MaterialIcon';
import { SchemaFormField } from '../schema-form-field';
import { useConnectorsStore } from '../../store';
import { ConnectorsApi } from '../../api';
import { isNoneAuthType, isOAuthType } from '../../utils/auth-helpers';
import { DocumentationSection } from './documentation-section';
import { OAuthSection } from './oauth-section';
import { resolveAuthFields, formatAuthTypeName } from './helpers';
import type { AuthCardState } from '../../types';

// ========================================
// Component
// ========================================

export function AuthenticateTab() {
  const {
    connectorSchema,
    connectorConfig,
    panelConnector,
    panelConnectorId,
    selectedAuthType,
    isAuthTypeImmutable: _isAuthTypeImmutable,
    formData,
    formErrors,
    conditionalDisplay,
    authState,
    setAuthFormValue,
    setSelectedAuthType,
  } = useConnectorsStore();

  if (!connectorSchema || !panelConnector) return null;

  const isCreateMode = !panelConnectorId;
  const schema = connectorSchema;
  const authConfig = schema.auth;
  const supportedAuthTypes = authConfig?.supportedAuthTypes ?? [];
  const showAuthTypeSelector = isCreateMode && supportedAuthTypes.length > 1;

  // Resolve current auth schema fields based on selected auth type
  const currentSchemaFields = resolveAuthFields(authConfig, selectedAuthType);

  return (
    <AuthenticateTabInner
      connectorSchema={connectorSchema}
      connectorConfig={connectorConfig}
      panelConnector={panelConnector}
      panelConnectorId={panelConnectorId}
      selectedAuthType={selectedAuthType}
      isCreateMode={isCreateMode}
      authConfig={authConfig}
      supportedAuthTypes={supportedAuthTypes}
      showAuthTypeSelector={showAuthTypeSelector}
      currentSchemaFields={currentSchemaFields}
      schema={schema}
      formData={formData}
      formErrors={formErrors}
      conditionalDisplay={conditionalDisplay}
      authState={authState}
      setAuthFormValue={setAuthFormValue}
      setSelectedAuthType={setSelectedAuthType}
    />
  );
}

/**
 * Inner component that can use hooks unconditionally.
 */
function AuthenticateTabInner({
  connectorSchema,
  connectorConfig,
  panelConnector,
  panelConnectorId,
  selectedAuthType,
  isCreateMode,
  authConfig,
  supportedAuthTypes,
  showAuthTypeSelector,
  currentSchemaFields,
  schema,
  formData,
  formErrors,
  conditionalDisplay,
  authState,
  setAuthFormValue,
  setSelectedAuthType,
}: {
  connectorSchema: NonNullable<ReturnType<typeof useConnectorsStore.getState>['connectorSchema']>;
  connectorConfig: ReturnType<typeof useConnectorsStore.getState>['connectorConfig'];
  panelConnector: NonNullable<ReturnType<typeof useConnectorsStore.getState>['panelConnector']>;
  panelConnectorId: string | null;
  selectedAuthType: string;
  isCreateMode: boolean;
  authConfig: typeof connectorSchema.auth;
  supportedAuthTypes: string[];
  showAuthTypeSelector: boolean;
  currentSchemaFields: ReturnType<typeof resolveAuthFields>;
  schema: typeof connectorSchema;
  formData: ReturnType<typeof useConnectorsStore.getState>['formData'];
  formErrors: ReturnType<typeof useConnectorsStore.getState>['formErrors'];
  conditionalDisplay: ReturnType<typeof useConnectorsStore.getState>['conditionalDisplay'];
  authState: ReturnType<typeof useConnectorsStore.getState>['authState'];
  setAuthFormValue: (name: string, value: unknown) => void;
  setSelectedAuthType: (authType: string) => void;
}) {
  // ── Auto-populate OAuth credentials from OAuth config ──
  const oauthPopulatedRef = useRef(false);

  const oauthFieldNames = useMemo(() => {
    if (!isOAuthType(selectedAuthType) || !currentSchemaFields.length) return [];
    return currentSchemaFields.map((f) => f.name);
  }, [selectedAuthType, currentSchemaFields]);

  useEffect(() => {
    // Only populate once per panel open, only in edit mode with OAuth
    if (isCreateMode || !isOAuthType(selectedAuthType) || oauthPopulatedRef.current) return;
    if (oauthFieldNames.length === 0) return;

    // Get oauthConfigId from the connector config (dynamic field not in type)
    const configAuth = connectorConfig?.config?.auth as Record<string, unknown> | undefined;
    const oauthConfigId = configAuth?.oauthConfigId as string | undefined;
    if (!oauthConfigId || !panelConnector.type) return;

    oauthPopulatedRef.current = true;

    // Fetch the OAuth config and populate form fields
    ConnectorsApi.getOAuthConfig(panelConnector.type, oauthConfigId)
      .then((oauthConfig) => {
        if (!oauthConfig) return;
        const config = (oauthConfig.config ?? oauthConfig) as Record<string, unknown>;
        for (const fieldName of oauthFieldNames) {
          const value = config[fieldName];
          if (value !== null && value !== undefined && value !== '') {
            setAuthFormValue(fieldName, value);
          }
        }
      })
      .catch(() => {
        // Silently fail — fields will remain empty
      });
  }, [isCreateMode, selectedAuthType, oauthFieldNames, connectorConfig, panelConnector.type, panelConnectorId, setAuthFormValue]);

  // Documentation links
  const docLinks = schema.documentationLinks ?? [];

  // Determine if the auth card should be shown
  const showAuthCard = !isNoneAuthType(selectedAuthType);

  // Map authState to AuthCardState for the card
  const cardState: AuthCardState =
    authState === 'authenticating' ? 'empty' : (authState as AuthCardState);

  return (
    <Flex direction="column" gap="6" style={{ padding: '4px 0' }}>
      {/* ── A. Setup Documentation ── */}
      {docLinks.length > 0 && (
        <DocumentationSection
          links={docLinks}
          connectorIconPath={panelConnector.iconPath}
        />
      )}

      {/* ── Auth Type Selector (create mode only, multiple auth types) ── */}
      {showAuthTypeSelector && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
            Authentication Method
          </Text>
          <Select.Root
            value={selectedAuthType}
            onValueChange={setSelectedAuthType}
          >
            <Select.Trigger
              style={{ width: '100%', height: 32 }}
              placeholder="Select auth type..."
            />
            <Select.Content>
              {supportedAuthTypes.map((type) => (
                <Select.Item key={type} value={type}>
                  {formatAuthTypeName(type)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      )}

      {/* ── B. Auth Fields Section ── */}
      {currentSchemaFields.length > 0 && (
        <Flex direction="column" gap="5">
          <Flex direction="column" gap="1">
            <Text size="3" weight="medium" style={{ color: 'var(--gray-12)' }}>
              {formatAuthTypeName(selectedAuthType)} Credentials
            </Text>
            <Text size="1" style={{ color: 'var(--gray-10)' }}>
              Enter your {panelConnector.name} authentication details
            </Text>
          </Flex>

          {/* Render each auth field */}
          {currentSchemaFields.map((field) => {
            const isVisible =
              conditionalDisplay[field.name] !== undefined
                ? conditionalDisplay[field.name]
                : true;

            return (
              <SchemaFormField
                key={field.name}
                field={field}
                value={formData.auth[field.name]}
                onChange={setAuthFormValue}
                visible={isVisible}
                error={formErrors[field.name]}
                disabled={false}
              />
            );
          })}
        </Flex>
      )}

      {/* ── C. OAuth / Auth Card ── */}
      {showAuthCard && isOAuthType(selectedAuthType) && (
        <OAuthSection
          cardState={cardState}
          connectorName={panelConnector.name}
          isLoading={authState === 'authenticating'}
        />
      )}

      {/* ── For NONE auth type, show info message ── */}
      {isNoneAuthType(selectedAuthType) && (
        <Flex
          align="center"
          gap="2"
          style={{
            backgroundColor: 'var(--green-a3)',
            borderRadius: 'var(--radius-2)',
            padding: '12px 16px',
          }}
        >
          <MaterialIcon name="check_circle" size={16} color="var(--green-a11)" />
          <Text size="2" style={{ color: 'var(--green-a11)' }}>
            No authentication required for this connector
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
