# Elevate if necessary
# Modified from Venryx's answer here: https://stackoverflow.com/a/57035712 
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$pwd'; & '$PSCommandPath' $args;`"" -Verb RunAs;
  exit;
}

# Makes a certificate
# Modified from Russell Smith's tutorial here: https://www.petri.com/create-self-signed-certificate-using-powershell
function MakeCert() {
  [CmdletBinding()]
  # Init params
  Param (
    [String] $CertStore = "cert:\LocalMachine\My",
    [String] $PfxOut = ".\ssl-gen\cert.pfx",
    [String] $JsOut = ".\ssl-gen\https-config.gen.js"
  )
  
  Write-Output "CertStore: $CertStore"
  Write-Output "PfxOut: $PfxOut"
  Write-Output "JsOut: $JsOut"

  # Make cert
  Write-Debug ('New-SelfSignedCertificate -DnsName "localhost" -FriendlyName "Localhost" -CertStoreLocation ' + $CertStore)
  $cert = New-SelfSignedCertificate -DnsName "localhost" -FriendlyName "Localhost" -CertStoreLocation $CertStore
  Write-Output "Certificate `Localhost` created in $CertStore"

  # Export PFX
  $certPath = $CertStore + "\" + $cert.Thumbprint
  Write-Output "Enter Passphrase for PFX:"
  $pw = (Read-Host -AsSecureString)
  Write-Debug "Export-PfxCertificate -Cert $certPath -FilePath $PfxOut -Password $pw"
  Export-PfxCertificate -Cert $certPath -FilePath $PfxOut -Password $pw
  Write-Output "Certificate exported to $PfxOut"

  # Make config
  'const fs = require("fs");
  module.exports = {
    pfx: fs.readFileSync(String.raw`' + $PfxOut + '`),
    passphrase: "' + [System.Net.NetworkCredential]::new("", $pw).Password + '"
  }' | Set-Content -Path $JsOut

  # Prompt install
  Start-Process $PfxOut
}
Write-Output $args
MakeCert @args
Pause