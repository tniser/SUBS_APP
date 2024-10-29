!macro customInstall
  CreateDirectory $LOCALAPPDATA\CMEG_Subscription_Requests
  CopyFiles $INSTDIR\user.config $LOCALAPPDATA\CMEG_Subscription_Requests
  Delete $INSTDIR\user.config
!macroend