#!/usr/bin/env python3
from datetime import datetime
from confluent_kafka import Consumer, KafkaError
import json
import os
import psycopg2

PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_DATABASE = os.getenv("PG_DATABASE", "flightdb")
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD")
PG_TABLE = os.getenv("PG_TABLE", "flight-recos")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "decorated-recos")

consumer_conf = {
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "group.id": "reco-writers",
    "auto.offset.reset": "earliest",
}
consumer = Consumer(consumer_conf)
consumer.subscribe([KAFKA_TOPIC])


def create_table(cursor):
    create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS {PG_TABLE} (
            search_id VARCHAR,
            search_country VARCHAR,
            OnD VARCHAR,
            trip_type VARCHAR,
            main_airline VARCHAR,
            price_EUR FLOAT,
            advance_purchase INTEGER,
            number_of_flights INTEGER,
            search_time TIMESTAMP,
            passengers VARCHAR,
            cabin VARCHAR,
            stay_duration INTEGER
        )
    """
    cursor.execute(create_table_sql)


def populate_postgres_from_kafka():
    try:
        print("Consumer started")
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            dbname=PG_DATABASE,
            user=PG_USER,
            password=PG_PASSWORD,
        )
        cursor = conn.cursor()

        create_table(cursor)

        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    print(
                        f"Consumer reached end of partition {msg.topic()} [{msg.partition()}]"
                    )
                elif msg.error():
                    print(f"Error: {msg.error()}")
                continue

            json_data = json.loads(msg.value().decode("utf-8"))
            print("loaded: ", json_data)

            search_id = json_data["search_id"]
            search_country = json_data["search_country"]
            OnD = json_data["OnD"]
            trip_type = json_data["trip_type"]
            search_date = json_data["search_date"]
            search_time = json_data["search_time"]
            timestamp = datetime.strptime(
                search_date + "T" + search_time, "%Y-%m-%dT%H:%M:%S"
            )

            for reco in json_data["recos"]:
                passengers = json_data["passengers_string"]
                cabin = reco["main_cabin"]
                stay_duration = -1
                try:
                    if len(json_data["request_dep_date"]) > 1:
                        stay_duration = (datetime.strptime(json_data["request_return_date"], "%Y-%m-%d") - datetime.strptime(json_data["request_dep_date"], "%Y-%m-%d")).days
                except Exception as e:
                    print(f"Error calculating stay duration: {e}")

                sql = f"""
                    INSERT INTO {PG_TABLE} (search_id, search_country, OnD, trip_type, main_airline,
                                            price_EUR, advance_purchase, number_of_flights, search_time,
                                            passengers, cabin, stay_duration)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(
                    sql,
                    (
                        search_id,
                        search_country,
                        OnD,
                        trip_type,
                        reco["main_marketing_airline"],
                        reco["price_EUR"],
                        json_data["advance_purchase"],
                        reco["nb_of_flights"],
                        timestamp,
                        passengers,
                        cabin,
                        stay_duration
                    ),
                )

                conn.commit()

    except KeyboardInterrupt:
        consumer.close()
        cursor.close()
        conn.close()

    finally:
        consumer.close()
        cursor.close()
        conn.close()


if __name__ == "__main__":
    populate_postgres_from_kafka()
