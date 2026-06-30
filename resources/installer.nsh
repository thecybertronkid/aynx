; AYNX Custom NSIS Installer Extension v2.5.1
; (c) 2026 Ayan Kashyap
;
; This file is included automatically in electron-builder's NSIS template.
; Provides a merged personalization and license/trial activation page.

!include "LogicLib.nsh"
!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER

  ; Variables for Merged Registration page
  Var RegistrationDlg
  Var NameInput
  Var NameValue
  Var EmailInput
  Var EmailValue
  Var LicenseKeyInput
  Var LicenseKeyValue

  ; ─── PAGE HOOKS ─────────────────────────────────────────────────────────────
  !macro customPageAfterChangeDir
    Page custom RegistrationPageCreate RegistrationPageLeave
  !macroend

  !macro customInstall
    ; Write display name, email and key to registry so AYNX can read them on first launch
    WriteRegStr HKCU "Software\AYNX" "DisplayName" $NameValue
    WriteRegStr HKCU "Software\AYNX" "Email"       $EmailValue
    WriteRegStr HKCU "Software\AYNX" "LicenseKey"  $LicenseKeyValue
    WriteRegStr HKCU "Software\AYNX" "Version"     "2.5.1"
  !macroend

  !macro customUnInstall
    DeleteRegKey HKCU "Software\AYNX"
  !macroend

  ; ─── MERGED REGISTRATION PAGE ──────────────────────────────────────────────
  Function RegistrationPageCreate
    nsDialogs::Create 1018
    Pop $RegistrationDlg
    ${If} $RegistrationDlg == error
      Abort
    ${EndIf}

    ; Heading
    ${NSD_CreateLabel} 0 0 100% 12u "AYNX Personalization and Activation"
    Pop $0
    CreateFont $1 "Segoe UI" 11 700
    SendMessage $0 ${WM_SETFONT} $1 1

    ${NSD_CreateLabel} 0 14u 100% 12u "Enter your details to personalize AYNX and activate your license."
    Pop $0

    ${NSD_CreateHLine} 0 28u 100% 1u ""
    Pop $0

    ; Full Name
    ${NSD_CreateLabel} 0 32u 100% 10u "Full Name:"
    Pop $0
    ${NSD_CreateText} 0 44u 100% 13u ""
    Pop $NameInput

    ; Email Address
    ${NSD_CreateLabel} 0 60u 100% 10u "Email Address:"
    Pop $0
    ${NSD_CreateText} 0 72u 100% 13u ""
    Pop $EmailInput

    ; License Key
    ${NSD_CreateLabel} 0 88u 100% 10u "License Key (Optional - leave blank for free 1-month Plus trial):"
    Pop $0
    ${NSD_CreateText} 0 100u 100% 13u ""
    Pop $LicenseKeyInput

    ${NSD_CreateHLine} 0 117u 100% 1u ""
    Pop $0

    ${NSD_CreateLabel} 0 122u 100% 10u "AYNX Universal Media Downloader - (c) 2026 Ayan Kashyap"
    Pop $0

    nsDialogs::Show
  FunctionEnd

  Function RegistrationPageLeave
    ${NSD_GetText} $NameInput $NameValue
    ${NSD_GetText} $EmailInput $EmailValue
    ${NSD_GetText} $LicenseKeyInput $LicenseKeyValue

    ; Validate email is not empty
    ${If} $EmailValue == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "Please enter your Email Address to continue."
      Abort
    ${EndIf}

    ; Default name to "Local Service" if left blank
    ${If} $NameValue == ""
      StrCpy $NameValue "Local Service"
    ${EndIf}

    ; Default license key to TRIAL if left blank
    ${If} $LicenseKeyValue == ""
      StrCpy $LicenseKeyValue "TRIAL"
    ${EndIf}
  FunctionEnd

!endif
