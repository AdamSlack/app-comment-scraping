---------------------------------------------
-- Create Database
---------------------------------------------
create database comments;

begin;

create table appID (
    ID           text   primary key not null,
    id_num       serial             not null,
    last_scraped date
);

create table comments (
    ID             text references appID(ID) not null,
    author         text                      not null,
    date_written   date                      not null,
    json_object    json                      not null,
    primary key (ID, author, date_written)
);

commit;

begin;

create table temp(
    id    serial primary key not null,
    appid text
);

-- replace path with location of app IDs
copy temp(appid) from '/var/commentScraping/appIDs/out.csv' with (format csv);

insert into appid (id) select distinct appid from temp;

drop table if exists temp;

commit;