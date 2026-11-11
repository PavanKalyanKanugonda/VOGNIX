package com.vognix;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class VognixApplication {

    public static void main(String[] args) {
        SpringApplication.run(VognixApplication.class, args);
    }
}
