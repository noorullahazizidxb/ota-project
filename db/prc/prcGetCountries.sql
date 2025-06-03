CREATE DEFINER=`root`@`localhost` PROCEDURE `prcGetCountries`(in prmNam varchar(50), in prmLanguage char(2))
BEGIN
select
	id,
	countryCode,
    countryName,
case when
    prmLanguage='fa' then
	countries.language ->> '$.fa'
    else '' end as language
	from countries
    where countryName like concat(prmNam , '%') or (prmLanguage='fa' and countries.language ->> '$.fa' like concat(prmNam , '%'));
END