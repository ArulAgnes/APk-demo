# MathSphere AI — Android Physical Device Test Checklist

This checklist is designed for QA testers, developers, and students verifying the **MathSphere AI** Android application (`com.arulagnes.mathsphereai`) on a physical Android phone or tablet.

---

## Pre-Test Setup

- [ ] Download `app-debug.apk` from GitHub Actions artifacts (`MathSphere-AI-Android-Debug-APK`).
- [ ] Transfer and install `app-debug.apk` on a physical Android device (Android 5.1 to Android 14+).
- [ ] Ensure the device battery is above 20%.

---

## 1. Airplane Mode First-Launch Test (Critical Offline Test)

> [!IMPORTANT]
> The application must launch and be 100% usable on its very first launch without ever connecting to the internet.

- [ ] **Step 1:** Enable **Airplane Mode** on the phone (confirm Wi-Fi, Mobile Data, and Bluetooth are OFF).
- [ ] **Step 2:** Tap the **MathSphere AI** app icon from the home screen or app drawer.
- [ ] **Verification:**
  - [ ] App launches smoothly without crashing or showing an Android "App stopped" dialog.
  - [ ] The splash screen appears briefly and transitions smoothly to the calculator interface.
  - [ ] The app displays the offline status indicator: `Offline Standalone Mode — All Calculations Run Locally`.
  - [ ] No blank white screen or "Network Error" alerts are shown.

---

## 2. Mathematical Calculation Verification (Airplane Mode)

With the device still in **Airplane Mode**, execute calculations across each solver category:

### Test 2.1: Matrix Operations
- [ ] Navigate to **Matrix Operations**.
- [ ] Select Matrix Addition ($A + B$) with $3 \times 3$ matrices.
- [ ] Tap **Calculate**.
- [ ] **Result:** Output matrix renders instantly with correct element sums.

### Test 2.2: Row Echelon Form (REF / RREF)
- [ ] Navigate to **REF & RREF**.
- [ ] Load the example matrix or input:
  $$\begin{pmatrix} 1 & 2 & -1 \\ -2 & -4 & 4 \\ 3 & 6 & 1 \end{pmatrix}$$
- [ ] Tap **Compute RREF**.
- [ ] **Result:** Step-by-step row transformations and final RREF matrix display correctly with KaTeX notation.

### Test 2.3: Determinant & Matrix Inverse
- [ ] Navigate to **Determinants & Inverses**.
- [ ] Input an invertible $3 \times 3$ matrix.
- [ ] Tap **Compute Inverse**.
- [ ] **Result:** Determinant value $\det(A)$ and inverse matrix $A^{-1}$ are produced with zero network lag.

### Test 2.4: Singular Value Decomposition (SVD)
- [ ] Navigate to **SVD (Singular Value Decomposition)**.
- [ ] Select a $3 \times 3$ matrix:
  $$\begin{pmatrix} 3 & 2 & 2 \\ 2 & 3 & -2 \end{pmatrix}$$
- [ ] Tap **Compute SVD**.
- [ ] **Result:** Complete 14-step mathematical derivation prints:
  - Step 1: $A^T A$ computation.
  - Step 2: Characteristic polynomial and eigenvalues $\lambda_i$.
  - Step 3: Singular values $\sigma_i = \sqrt{\lambda_i}$.
  - Step 4: Orthonormal eigenvectors forming matrix $V$.
  - Step 5: Left singular vectors forming matrix $U$.
  - Step 6: Reconstruction verification $A = U \Sigma V^T$.

### Test 2.5: QR Decomposition & Least Squares
- [ ] Navigate to **QR Decomposition**.
- [ ] Tap **Compute QR**.
- [ ] **Result:** Orthogonal matrix $Q$ and upper triangular matrix $R$ are calculated such that $Q^T Q = I$ and $A = QR$.

### Test 2.6: Principal Component Analysis (PCA)
- [ ] Navigate to **Principal Component Analysis**.
- [ ] Enter a sample $4 \times 3$ dataset.
- [ ] Tap **Compute PCA**.
- [ ] **Result:** Mean vector, centered data matrix, covariance matrix, and explained variance percentages render clearly.

### Test 2.7: Number Theory & Cryptography
- [ ] Navigate to **Number Theory**.
- [ ] Test **Modular Exponentiation:** $b^e \pmod{m}$.
- [ ] Test **Extended Euclidean Algorithm:** $\gcd(a, b) = ax + by$.
- [ ] Test **RSA Key Generation:** Generates valid $p, q, n, e, d$ keypairs on-device.

---

## 3. UI, Typography, and Hardware Integration

### Test 3.1: Mathematical Typography (KaTeX)
- [ ] Observe fractions, square roots, summation symbols, and greek letters ($\lambda, \sigma, \Sigma$).
- [ ] **Result:** Characters render as crisp vector shapes using bundled `.woff2` fonts with no box glyphs (``) or unrendered LaTeX code (`\frac`).

### Test 3.2: Android Hardware Back Button
- [ ] Open a sub-calculator (e.g. SVD).
- [ ] Tap the Android physical / gesture **Back Button**.
- [ ] **Result:** Navigates back to the main topic menu rather than exiting the application immediately.
- [ ] Press **Back Button** at the root menu.
- [ ] **Result:** Double-tap confirmation prompt appears before exiting the app.

### Test 3.3: Soft Keyboard & Input Focus
- [ ] Tap on an individual matrix cell input.
- [ ] **Result:** The Android software keyboard opens in decimal/numeric mode.
- [ ] **Result:** The screen viewport shifts upward smoothly so the active input cell is never obscured behind the keyboard.
- [ ] Tap outside or tap the keyboard hide button; viewport returns to standard position.

### Test 3.4: Display Notch & Safe Area Handling
- [ ] Rotate device between Portrait and Landscape orientations.
- [ ] **Result:** Content respects camera punch-holes, teardrop notches, and the Android gesture navigation bar.
- [ ] Header and calculation results are never clipped by screen corners.

### Test 3.5: Light & Dark Theme
- [ ] Tap the theme toggle button in the header.
- [ ] **Result:** UI switches smoothly between dark (`#08090c`) and light (`#ffffff`) modes.
- [ ] The Android native status bar background updates to match the chosen theme.

---

## 4. Online-Connected & Sync Tests (For Online APK Builds)

*Skip this section if testing the offline standalone APK.*

- [ ] Connect the device to Wi-Fi.
- [ ] Log in with user credentials.
- [ ] Open **My MathBook** and navigate to a saved solution.
- [ ] Turn on **Airplane Mode** (disconnect internet).
- [ ] Edit a note in the notebook. Notice the badge indicates `queued (offline)`.
- [ ] Disable Airplane Mode (restore internet).
- [ ] Within 30-45 seconds, verify the sync manager triggers:
  - [ ] Status updates to `saved`.
  - [ ] Queued write count returns to `0`.
  - [ ] Refresh the page or restart the app; note changes persist on the cloud database.

---

## Final QA Sign-Off

| Tested By | Device Model | Android Version | Overall Result | Date |
| :--- | :--- | :--- | :--- | :--- |
| ______________ | __________________ | ________________ | [ ] PASS  [ ] FAIL | ____________ |
