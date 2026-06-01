## 1. Data Derivation Logic
- [x] 1.1 Create `bestScores` Map from attemptHistory (group by tryoutId, take max totalScore)
- [x] 1.2 Create `ownedPkgIds` from userPayments (filter pending|verified, map to packageId)
- [x] 1.3 Create `availablePackages` (active, non-trial, not owned)
- [x] 1.4 Create `ownedPackages` (active, non-trial, owned)

## 2. Trial Card
- [x] 2.1 Extract trial card to separate component or keep inline
- [x] 2.2 Ensure trial card always renders at top

## 3. Available Packages Section
- [x] 3.1 Create section with "Beli Paket Tryout" header
- [x] 3.2 Render package cards with name, price, "Beli" button
- [x] 3.3 "Beli" button redirects to `/buy`
- [x] 3.4 Hide section when no available packages

## 4. Owned Packages Section
- [x] 4.1 Create section with "Paket Tryout Kamu" header
- [x] 4.2 Create OwnedPackageCard component showing package name and progress (X/Y)
- [x] 4.3 Render tryout list within each package card
- [x] 4.4 Show score (from bestScores) or "Belum dikerjakan"
- [x] 4.5 Add "Mulai" button per tryout (calls handleStartTryout)
- [x] 4.6 Hide section when no owned packages

## 5. Cleanup
- [x] 5.1 Remove payment modal (select-package, payment, success steps)
- [x] 5.2 Remove unused state (paymentModal, proofFile, proofFileRaw, uploadError, fileInputRef)
- [x] 5.3 Remove unused imports (useBanks, useUploadProof, useCreatePayment)
- [x] 5.4 Remove buildTryoutToPackages helper (no longer needed)

## 6. Loading State
- [x] 6.1 Show loading spinner while data fetches
