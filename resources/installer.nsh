; AYNX Custom NSIS Installer Extension v2.5.1
; (c) 2026 Ayan Kashyap
;
; This file is included automatically in electron-builder's NSIS template.
; Directly registers defaults to registry and skips user forms.

!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER

  !macro customInstall
    ; Write default values so AYNX boots directly into welcome onboarding
    WriteRegStr HKCU "Software\AYNX" "DisplayName" "Local User"
    WriteRegStr HKCU "Software\AYNX" "Email"       ""
    WriteRegStr HKCU "Software\AYNX" "LicenseKey"  "TRIAL"
    WriteRegStr HKCU "Software\AYNX" "Version"     "2.5.1"
  !macroend

  !macro customUnInstall
    DeleteRegKey HKCU "Software\AYNX"
  !macroend

!endif
