const escapeAttribute=value=>String(value).replace(/[&"]/g,character=>character==='&'?'&amp;':'&quot;');

export function mediaFilePickerMarkup(accept='video/mp4,video/webm'){
  return `<label class="media-file-picker"><span data-sylora-copy="chooseMediaFile">Обрати медіафайл</span><strong data-file-name data-sylora-copy="noFileChosen">Файл не вибрано</strong><input class="media-file-input" name="file" type="file" accept="${escapeAttribute(accept)}" required></label>`;
}

export function bindMediaFilePicker(form){
  const input=form?.querySelector('.media-file-input');
  const name=form?.querySelector('[data-file-name]');
  if(!input||!name)return;
  input.addEventListener('change',()=>{
    const file=input.files?.[0];
    if(file){
      delete name.dataset.syloraCopy;
      name.dataset.userContent='';
      name.textContent=file.name;
      return;
    }
    name.removeAttribute('data-user-content');
    name.dataset.syloraCopy='noFileChosen';
    name.textContent='Файл не вибрано';
  });
}
