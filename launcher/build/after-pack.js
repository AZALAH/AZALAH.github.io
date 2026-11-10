// Stamps the Windows executable with the launcher's icon and name (electron-builder afterPack hook).
const fs = require('fs'), path = require('path');
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const exePath = path.join(ctx.appOutDir, ctx.packager.appInfo.productFilename + '.exe');
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, groups.length ? groups[0].id : 1, groups.length ? groups[0].lang : 1033, ico.icons.map(i => i.data));
  const v = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (v) {
    const [a, b, c] = ctx.packager.appInfo.version.split('.').map(Number);
    v.setFileVersion(a, b, c, 0, 1033); v.setProductVersion(a, b, c, 0, 1033);
    v.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: 'AZALAH Launcher', FileDescription: 'AZALAH Launcher', CompanyName: 'Ahmed Salah', LegalCopyright: 'Copyright Ahmed Salah', OriginalFilename: 'AZALAH Launcher.exe', InternalName: 'AZALAH Launcher' });
    v.outputToResourceEntries(res.entries);
  }
  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
};
