CREATE DEFINER=`root`@`localhost` PROCEDURE `prcGetAirlines`(in paramNam varchar(50))
BEGIN
select name, iata from airlines where name like concat(paramNam , '%') or iata like concat(paramNam , '%');
END