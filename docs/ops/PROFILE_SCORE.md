# PROFILE_SCORE

Profile score is backend-calculated and returned with profile APIs.

Suggested weighted model (total 100):
- photo: 10
- userId: 10
- name: 10
- phoneVerified: 10
- emailVerified: 10
- guardianPhone: 10
- address: 10
- SSC: 5
- HSC: 5
- department: 5
- collegeName: 5
- DOB: 10

Gate rule for exam participation:
- `profileScore >= 70` and payment/subscription eligibility as configured.
