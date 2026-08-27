const COPY=Object.freeze({
  en:Object.freeze({
    usernameLabel:'Username',emailLabel:'Email',passwordLabel:'Password',identityLabel:'Email or username',
    usernameHint:'3–30 Latin letters, numbers, or underscore (_).',passwordHint:'10–256 characters with at least one letter and one number.',
    required:'Fill in this field.',invalidEmail:'Enter a valid email address.',invalidUsername:'Use 3–30 Latin letters, numbers, or underscore (_).',
    invalidPassword:'Use 10–256 characters with at least one letter and one number.',accountExists:'An account with this email or username already exists.',
    invalidCredentials:'The email, username, or password is incorrect.',accountUnavailable:'This account is unavailable.',rateLimited:'Too many attempts. Wait a moment and try again.',
    networkError:'Cannot reach the account service. Check your connection and try again.',serviceUnavailable:'The account service is temporarily unavailable. Try again shortly.',
    unexpectedError:'Could not complete sign-in. Try again.',working:'Please wait…'
  }),
  uk:Object.freeze({
    usernameLabel:'Ім’я користувача',emailLabel:'Email',passwordLabel:'Пароль',identityLabel:'Email або ім’я користувача',
    usernameHint:'3–30 латинських літер, цифр або символів _.',passwordHint:'10–256 символів, щонайменше одна літера й одна цифра.',
    required:'Заповни це поле.',invalidEmail:'Введи коректну email-адресу.',invalidUsername:'Використай 3–30 латинських літер, цифр або символів _.',
    invalidPassword:'Пароль має містити 10–256 символів, щонайменше одну літеру й одну цифру.',accountExists:'Акаунт із таким email або іменем користувача вже існує.',
    invalidCredentials:'Email, ім’я користувача або пароль неправильні.',accountUnavailable:'Цей акаунт недоступний.',rateLimited:'Забагато спроб. Зачекай трохи й спробуй ще раз.',
    networkError:'Не вдалося зв’язатися із сервісом акаунтів. Перевір інтернет і спробуй ще раз.',serviceUnavailable:'Сервіс акаунтів тимчасово недоступний. Спробуй трохи пізніше.',
    unexpectedError:'Не вдалося завершити вхід. Спробуй ще раз.',working:'Зачекай…'
  }),
  pl:Object.freeze({
    usernameLabel:'Nazwa użytkownika',emailLabel:'Email',passwordLabel:'Hasło',identityLabel:'Email lub nazwa użytkownika',
    usernameHint:'3–30 łacińskich liter, cyfr lub znaków _.',passwordHint:'10–256 znaków, co najmniej jedna litera i jedna cyfra.',
    required:'Wypełnij to pole.',invalidEmail:'Wpisz prawidłowy adres email.',invalidUsername:'Użyj 3–30 łacińskich liter, cyfr lub znaków _.',
    invalidPassword:'Hasło musi mieć 10–256 znaków oraz zawierać literę i cyfrę.',accountExists:'Konto z tym adresem email lub nazwą użytkownika już istnieje.',
    invalidCredentials:'Email, nazwa użytkownika lub hasło są nieprawidłowe.',accountUnavailable:'To konto jest niedostępne.',rateLimited:'Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.',
    networkError:'Nie można połączyć się z usługą kont. Sprawdź internet i spróbuj ponownie.',serviceUnavailable:'Usługa kont jest chwilowo niedostępna. Spróbuj ponownie wkrótce.',
    unexpectedError:'Nie udało się zakończyć logowania. Spróbuj ponownie.',working:'Proszę czekać…'
  }),
  de:Object.freeze({
    usernameLabel:'Benutzername',emailLabel:'E-Mail',passwordLabel:'Passwort',identityLabel:'E-Mail oder Benutzername',
    usernameHint:'3–30 lateinische Buchstaben, Zahlen oder _.',passwordHint:'10–256 Zeichen mit mindestens einem Buchstaben und einer Zahl.',
    required:'Dieses Feld ausfüllen.',invalidEmail:'Eine gültige E-Mail-Adresse eingeben.',invalidUsername:'3–30 lateinische Buchstaben, Zahlen oder _ verwenden.',
    invalidPassword:'Das Passwort muss 10–256 Zeichen sowie einen Buchstaben und eine Zahl enthalten.',accountExists:'Ein Konto mit dieser E-Mail oder diesem Benutzernamen existiert bereits.',
    invalidCredentials:'E-Mail, Benutzername oder Passwort ist falsch.',accountUnavailable:'Dieses Konto ist nicht verfügbar.',rateLimited:'Zu viele Versuche. Kurz warten und erneut versuchen.',
    networkError:'Der Kontodienst ist nicht erreichbar. Verbindung prüfen und erneut versuchen.',serviceUnavailable:'Der Kontodienst ist vorübergehend nicht verfügbar. Bitte später erneut versuchen.',
    unexpectedError:'Die Anmeldung konnte nicht abgeschlossen werden. Erneut versuchen.',working:'Bitte warten…'
  }),
  ru:Object.freeze({
    usernameLabel:'Имя пользователя',emailLabel:'Email',passwordLabel:'Пароль',identityLabel:'Email или имя пользователя',
    usernameHint:'3–30 латинских букв, цифр или символов _.',passwordHint:'10–256 символов, минимум одна буква и одна цифра.',
    required:'Заполните это поле.',invalidEmail:'Введите корректный email.',invalidUsername:'Используйте 3–30 латинских букв, цифр или символов _.',
    invalidPassword:'Пароль должен содержать 10–256 символов, минимум одну букву и одну цифру.',accountExists:'Аккаунт с таким email или именем пользователя уже существует.',
    invalidCredentials:'Email, имя пользователя или пароль неверны.',accountUnavailable:'Этот аккаунт недоступен.',rateLimited:'Слишком много попыток. Подождите и попробуйте снова.',
    networkError:'Не удалось связаться с сервисом аккаунтов. Проверьте интернет и попробуйте снова.',serviceUnavailable:'Сервис аккаунтов временно недоступен. Попробуйте немного позже.',
    unexpectedError:'Не удалось завершить вход. Попробуйте снова.',working:'Подождите…'
  })
});

const USERNAME_PATTERN=/^[A-Za-z0-9_]{3,30}$/;
const EMAIL_PATTERN=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_ERROR_KEYS=Object.freeze({
  INVALID_EMAIL:'invalidEmail',INVALID_USERNAME:'invalidUsername',INVALID_PASSWORD:'invalidPassword',
  ACCOUNT_ALREADY_EXISTS:'accountExists',INVALID_CREDENTIALS:'invalidCredentials',ACCOUNT_UNAVAILABLE:'accountUnavailable',
  RATE_LIMITED:'rateLimited',AUTH_REQUIRED:'invalidCredentials'
});

export function authText(locale,key){return COPY[locale]?.[key]??COPY.en[key]??key}

export function validateAuthInput(mode,input={}){
  if(mode==='login'){
    const identity=String(input.identity||'').trim();
    const password=String(input.password||'');
    if(!identity)return {ok:false,field:'identity',messageKey:'required'};
    if(!password)return {ok:false,field:'password',messageKey:'required'};
    return {ok:true,input:{identity,password}};
  }
  const username=String(input.username||'').trim();
  const email=String(input.email||'').trim();
  const password=String(input.password||'');
  if(!username)return {ok:false,field:'username',messageKey:'required'};
  if(!USERNAME_PATTERN.test(username))return {ok:false,field:'username',messageKey:'invalidUsername'};
  if(!email)return {ok:false,field:'email',messageKey:'required'};
  if(email.length>254||!EMAIL_PATTERN.test(email))return {ok:false,field:'email',messageKey:'invalidEmail'};
  if(!password)return {ok:false,field:'password',messageKey:'required'};
  if(password.length<10||password.length>256||!/[A-Za-z]/.test(password)||!/\d/.test(password))return {ok:false,field:'password',messageKey:'invalidPassword'};
  return {ok:true,input:{username,email,password}};
}

export function authErrorKey(error){
  const code=String(error?.data?.code||error?.data?.error||error?.message||'');
  if(AUTH_ERROR_KEYS[code])return AUTH_ERROR_KEYS[code];
  if(error?.status===429)return 'rateLimited';
  if(error?.status>=500)return 'serviceUnavailable';
  if(error?.name==='TypeError'||/failed to fetch|networkerror|load failed|fetch failed/i.test(code))return 'networkError';
  return 'unexpectedError';
}
