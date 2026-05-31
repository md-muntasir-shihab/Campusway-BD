Fix P0 and P1 security and missing feature bugs

Bug 1.14 (P0): Fix RBAC Bypass by checking for null modules in permission router and correctly rejecting mutate requests.
Bug 1.16 (P0): Fix CSRF middleware by universally applying it to state-changing routes (POST, PUT, PATCH, DELETE) at the router level.
Bug 1.19 (P1): Fix missing group assignment feature in ExamBuilderWizard by rendering a GroupSelector component.
Bug 1.20 (P1): Fix missing OG metadata features by exposing admin controls in the StaticPagesEditor.
Bug 1.21 (P1): Fix missing extended student profile data (Exam History, Performance Analytics, Device Info) by rendering it in an ExtendedProfileTab.
Bug 1.22 (P1): Fix missing batching delays in the Campaign Engine Service processSend method to correctly batch messages and apply wait logic.
