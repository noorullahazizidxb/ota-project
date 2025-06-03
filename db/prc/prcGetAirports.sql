CREATE DEFINER=`root`@`localhost` PROCEDURE `prcGetAirports`(in paramname varchar(50), in paramLanguage char(2))
BEGIN
select
	airports.airportCode,
	concat(airports.airportCode, ' - ', airports.airportName, ' - ', cities.cityName) as dataEn,
	case when
    paramLanguage='fa' then
    concat(countries.language ->> '$.fa',
    case when
    cities.language ->> '$.fa'='null'
    then '' 
    else concat( ' - ',cities.language ->> '$.fa') end,
    case when
    airports.language ->> '$.fa'='null'
    then '' else concat( ' - ',airports.language ->> '$.fa') end
    )else ''
    end as datalanguage
    FROM airports
    inner join cities on cities.id = airports.cityId
    inner join countries on countries.id = airports.countryId
    where airportCode like concat(paramname , '%')
    or airportName like concat(paramname , '%') 
    or cityName like concat(paramname , '%') 
	or (paramLanguage='fa' and countries.language ->> '$.fa' like concat(paramname , '%'))
    or (paramLanguage='fa' and  cities.language ->> '$.fa' like concat(paramname , '%')) 
    or (paramLanguage='fa' and airports.language ->> '$.fa' like concat(paramname , '%'));
END