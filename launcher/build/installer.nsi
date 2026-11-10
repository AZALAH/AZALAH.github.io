; AZALAH Launcher installer. Per-user install, no admin prompt.
Unicode true
!include "MUI2.nsh"
!define APP "AZALAH Launcher"
!define EXE "AZALAH Launcher.exe"
!define REG "Software\Microsoft\Windows\CurrentVersion\Uninstall\AZALAHLauncher"

Name "${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64
BrandingText "Ahmed Salah"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "CompanyName" "Ahmed Salah"
VIAddVersionKey "LegalCopyright" "Copyright Ahmed Salah"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Open ${APP}"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  ; close a running copy so its files can be replaced
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 400
  RMDir /r "$INSTDIR"
  SetOutPath "$INSTDIR"
  File /r "${SRC}/*.*"
  WriteUninstaller "$INSTDIR\Uninstall ${APP}.exe"
  CreateShortcut "$DESKTOP\${APP}.lnk" "$INSTDIR\${EXE}"
  CreateShortcut "$SMPROGRAMS\${APP}.lnk" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${REG}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${REG}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${REG}" "Publisher" "Ahmed Salah"
  WriteRegStr HKCU "${REG}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${REG}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${REG}" "UninstallString" '"$INSTDIR\Uninstall ${APP}.exe"'
  WriteRegStr HKCU "${REG}" "URLInfoAbout" "https://azalah.github.io"
  WriteRegDWORD HKCU "${REG}" "NoModify" 1
  WriteRegDWORD HKCU "${REG}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 400
  Delete "$DESKTOP\${APP}.lnk"
  Delete "$SMPROGRAMS\${APP}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REG}"
  MessageBox MB_YESNO|MB_ICONQUESTION "Also delete your save and downloaded updates?" IDNO done
  RMDir /r "$APPDATA\${APP}"
  done:
SectionEnd
